// Real local text generation - Qwen2.5-0.5B-Instruct, GGUF Q4_K_M quantized,
// CPU-only inference via candle (pure Rust + the `gemm` crate's CPU kernels -
// no CUDA/Metal, no C++/CMake toolchain needed to build, unlike llama.cpp
// bindings). Model + tokenizer are fetched once from the Hugging Face Hub on
// first startup (~350MB) and cached in the OS's hf-hub cache dir afterwards,
// the same auto-download-on-first-run pattern embed.rs already uses for the
// embedding model.
//
// This is genuinely small (0.5B parameters) - it will not match a frontier
// hosted model's quality, but it is a real language model producing real
// generated text, not a canned string.

use anyhow::Result;
use candle::quantized::gguf_file;
use candle::{Device, Tensor};
use candle_transformers::generation::{LogitsProcessor, Sampling};
use candle_transformers::models::quantized_qwen2::ModelWeights as Qwen2;
use std::sync::Mutex;
use tokenizers::Tokenizer;

const REPO_GGUF: &str = "Qwen/Qwen2-0.5B-Instruct-GGUF";
const GGUF_FILENAME: &str = "qwen2-0_5b-instruct-q4_0.gguf";
const REPO_TOKENIZER: &str = "Qwen/Qwen2-0.5B-Instruct";
const EOS_TOKEN_STR: &str = "<|im_end|>";

/// Minimal re-implementation of candle-examples' TokenOutputStream: token ids
/// decode to text incrementally, and a single UTF-8 codepoint can straddle
/// two token boundaries, so we only emit text once it's confirmed valid.
struct TokenOutputStream {
    tokenizer: Tokenizer,
    tokens: Vec<u32>,
    prev_text_len: usize,
}

impl TokenOutputStream {
    fn new(tokenizer: Tokenizer) -> Self {
        Self { tokenizer, tokens: Vec::new(), prev_text_len: 0 }
    }

    fn decode_all(&self) -> Result<String> {
        self.tokenizer
            .decode(&self.tokens, true)
            .map_err(anyhow::Error::msg)
    }

    /// Push a token; returns the newly-completed text fragment, if any.
    fn next_token(&mut self, token: u32) -> Result<Option<String>> {
        self.tokens.push(token);
        let text = self.decode_all()?;
        if text.len() > self.prev_text_len && text.chars().last().map(|c| !c.is_alphanumeric()).unwrap_or(true) {
            let fragment = text[self.prev_text_len..].to_string();
            self.prev_text_len = text.len();
            Ok(Some(fragment))
        } else {
            Ok(None)
        }
    }

    fn decode_rest(&self) -> Result<String> {
        let text = self.decode_all()?;
        Ok(text[self.prev_text_len..].to_string())
    }
}

pub struct Qwen2Session {
    model: Mutex<Qwen2>,
    tokenizer: Tokenizer,
    eos_token: u32,
    device: Device,
}

/// Downloads (first run only, then cached by hf-hub under the OS cache dir)
/// and loads the quantized Qwen2.5-0.5B-Instruct model. This does blocking
/// network + file I/O - call it via tokio::task::spawn_blocking, never
/// directly on an async task.
pub fn load() -> Result<Qwen2Session> {
    let device = Device::Cpu;

    println!("[slm-engine] fetching/locating GGUF model ({REPO_GGUF}/{GGUF_FILENAME})...");
    let api = hf_hub::api::sync::Api::new()?;
    let model_path = api
        .repo(hf_hub::Repo::with_revision(
            REPO_GGUF.to_string(),
            hf_hub::RepoType::Model,
            "main".to_string(),
        ))
        .get(GGUF_FILENAME)?;

    println!("[slm-engine] fetching/locating tokenizer ({REPO_TOKENIZER})...");
    let tokenizer_path = api.model(REPO_TOKENIZER.to_string()).get("tokenizer.json")?;
    let tokenizer = Tokenizer::from_file(&tokenizer_path).map_err(anyhow::Error::msg)?;

    println!("[slm-engine] loading GGUF weights into memory...");
    let mut file = std::fs::File::open(&model_path)?;
    let content = gguf_file::Content::read(&mut file).map_err(|e| e.with_path(&model_path))?;
    let model = Qwen2::from_gguf(content, &mut file, &device)?;

    let eos_token = *tokenizer
        .get_vocab(true)
        .get(EOS_TOKEN_STR)
        .ok_or_else(|| anyhow::anyhow!("EOS token {EOS_TOKEN_STR} not found in tokenizer vocab"))?;

    println!("[slm-engine] Qwen2.5-0.5B-Instruct ready.");
    Ok(Qwen2Session { model: Mutex::new(model), tokenizer, eos_token, device })
}

/// Generate a reply to `prompt`. `tier` maps to a sampling profile rather
/// than a different model (this service intentionally runs ONE well-tested
/// small model rather than juggling several GGUF architectures - see the
/// build notes for why that trade-off was made).
pub fn generate(session: &Qwen2Session, prompt: &str, tier: &str) -> Result<String> {
    let (temperature, sample_len): (f64, usize) = match tier {
        "fast" => (0.7, 160),
        "power" => (0.8, 512),
        _ => (0.75, 320), // "balanced" and any unrecognized tier
    };

    let mut model = session
        .model
        .lock()
        .map_err(|_| anyhow::anyhow!("model mutex poisoned"))?;

    let mut tos = TokenOutputStream::new(session.tokenizer.clone());
    let formatted = format!("<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n");
    let tokens = tos
        .tokenizer
        .encode(formatted, true)
        .map_err(anyhow::Error::msg)?;
    let tokens = tokens.get_ids();
    if tokens.is_empty() {
        return Ok(String::new());
    }

    let mut logits_processor = LogitsProcessor::from_sampling(
        299792458,
        if temperature <= 0.0 { Sampling::All { temperature: 1e-7 } } else { Sampling::All { temperature } },
    );

    let input = Tensor::new(tokens, &session.device)?.unsqueeze(0)?;
    let logits = model.forward(&input, 0)?;
    let logits = logits.squeeze(0)?;
    let mut next_token = logits_processor.sample(&logits)?;

    let mut all_tokens = vec![next_token];
    let mut out = String::new();
    if let Some(t) = tos.next_token(next_token)? {
        out.push_str(&t);
    }

    let repeat_penalty = 1.15f32;
    let repeat_last_n = 64usize;

    for index in 0..sample_len.saturating_sub(1) {
        if next_token == session.eos_token {
            break;
        }
        let input = Tensor::new(&[next_token], &session.device)?.unsqueeze(0)?;
        let logits = model.forward(&input, tokens.len() + index)?;
        let logits = logits.squeeze(0)?;
        let logits = {
            let start_at = all_tokens.len().saturating_sub(repeat_last_n);
            candle_transformers::utils::apply_repeat_penalty(&logits, repeat_penalty, &all_tokens[start_at..])?
        };
        next_token = logits_processor.sample(&logits)?;
        all_tokens.push(next_token);
        if let Some(t) = tos.next_token(next_token)? {
            out.push_str(&t);
        }
    }
    out.push_str(&tos.decode_rest()?);

    Ok(out.trim().to_string())
}

/// Entry point called by the axum handler. `session` is None when the model
/// failed to load at startup (e.g. no network on first run to fetch it) -
/// in that case we degrade gracefully instead of the endpoint 500ing, so the
/// TypeScript client's health-check-driven fallback to the local JS engine
/// still works exactly as designed even when this path is broken.
pub fn infer_gguf_sync(session: Option<&Qwen2Session>, prompt: &str, tier: &str) -> String {
    match session {
        None => format!(
            "[slm-engine] Model not loaded (see startup logs - likely no network on first run to \
             fetch {REPO_GGUF}). Falling through to the caller's own fallback. Prompt was: '{prompt}'"
        ),
        Some(session) => match generate(session, prompt, tier) {
            Ok(text) if !text.trim().is_empty() => text,
            Ok(_) => "[slm-engine] Model produced an empty response.".to_string(),
            Err(e) => format!("[slm-engine] Inference error: {e}"),
        },
    }
}
