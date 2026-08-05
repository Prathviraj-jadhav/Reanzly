use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

mod embed;
mod infer;

struct AppState {
    embedder: fastembed::TextEmbedding,
    // None when the GGUF model failed to load at startup (e.g. no network
    // on first run to fetch it from the Hugging Face Hub) - /infer degrades
    // gracefully in that case rather than the process failing to start.
    qwen: Option<infer::Qwen2Session>,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt::init();

    println!("Initializing Reanzly Offline SLM Engine...");

    // Initialize fastembed (22MB all-MiniLM-L6-v2 ONNX)
    let embedder = embed::build_embedder();
    println!("Embedding model (all-MiniLM-L6-v2) loaded successfully.");

    // Initialize the real GGUF text-generation model. This does blocking
    // network + file I/O (first run only - cached afterwards), so it runs
    // on a blocking thread rather than the async runtime.
    let qwen = match tokio::task::spawn_blocking(infer::load).await {
        Ok(Ok(session)) => Some(session),
        Ok(Err(e)) => {
            eprintln!("[slm-engine] WARNING: failed to load Qwen2 GGUF model: {e:#}");
            eprintln!("[slm-engine] /infer will report unavailable; callers fall back to their own local logic.");
            None
        }
        Err(e) => {
            eprintln!("[slm-engine] WARNING: model-load task panicked: {e:#}");
            None
        }
    };

    let shared_state = Arc::new(AppState { embedder, qwen });

    // Setup routes
    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/embed", post(embed_handler))
        .route("/infer", post(infer_handler))
        .layer(CorsLayer::permissive())
        .with_state(shared_state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3004));
    println!("SLM Engine listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_handler() -> &'static str {
    "OK"
}

#[derive(Deserialize)]
struct EmbedRequest {
    texts: Vec<String>,
}

async fn embed_handler(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    Json(payload): Json<EmbedRequest>,
) -> Json<Vec<Vec<f32>>> {
    let embeddings = embed::embed_batch(&state.embedder, payload.texts);
    Json(embeddings)
}

#[derive(Deserialize)]
struct InferRequest {
    prompt: String,
    tier: String,
    #[allow(dead_code)]
    stream: Option<bool>,
}

#[derive(Serialize)]
#[allow(dead_code)]
struct InferResponse {
    reply: String,
}

async fn infer_handler(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    Json(payload): Json<InferRequest>,
) -> String {
    // CPU-bound generation runs on a blocking thread so it doesn't stall the
    // async runtime's other in-flight requests (embeddings, health checks).
    let result = tokio::task::spawn_blocking(move || {
        infer::infer_gguf_sync(state.qwen.as_ref(), &payload.prompt, &payload.tier)
    })
    .await;

    match result {
        Ok(text) => text,
        Err(e) => format!("[slm-engine] Inference task panicked: {e}"),
    }
}
