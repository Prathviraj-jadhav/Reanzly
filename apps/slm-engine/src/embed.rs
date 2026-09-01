use fastembed::{InitOptionsUserDefined, TextEmbedding, TokenizerFiles, UserDefinedEmbeddingModel};
use std::fs;

// fastembed's own `TextEmbedding::try_new` downloads via its bundled hf-hub
// 0.3.2, which panics ("Bad URL: RelativeUrlWithoutBase") on Hugging Face's
// newer Xet-storage CDN redirects for this repo - an old, unmaintained
// download path, not anything wrong with the model or the inference code.
// fastembed's inference/tokenization itself is fine, so instead of that we
// download the same files ourselves with hf-hub 0.5.0 (already proven
// working elsewhere in this crate for the Qwen GGUF model, which correctly
// handles Xet) and hand the raw bytes to fastembed's "bring your own model"
// constructor.
const REPO: &str = "Qdrant/all-MiniLM-L6-v2-onnx";
const MODEL_FILE: &str = "model.onnx";

pub fn build_embedder() -> anyhow::Result<TextEmbedding> {
    let api = hf_hub::api::sync::Api::new()?;
    let repo = api.model(REPO.to_string());

    let onnx_file = fs::read(repo.get(MODEL_FILE)?)?;
    let tokenizer_files = TokenizerFiles {
        tokenizer_file: fs::read(repo.get("tokenizer.json")?)?,
        config_file: fs::read(repo.get("config.json")?)?,
        special_tokens_map_file: fs::read(repo.get("special_tokens_map.json")?)?,
        tokenizer_config_file: fs::read(repo.get("tokenizer_config.json")?)?,
    };

    TextEmbedding::try_new_from_user_defined(
        UserDefinedEmbeddingModel { onnx_file, tokenizer_files },
        InitOptionsUserDefined::default(),
    )
    .map_err(|e| anyhow::anyhow!("{e}"))
}

pub fn embed_batch(embedder: &TextEmbedding, texts: Vec<String>) -> Vec<Vec<f32>> {
    embedder.embed(texts, None).expect("Embedding failed")
}
