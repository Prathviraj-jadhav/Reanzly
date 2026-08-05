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
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt::init();

    println!("Initializing Reanzly Offline SLM Engine...");

    // Initialize fastembed (22MB all-MiniLM-L6-v2 ONNX)
    let embedder = embed::build_embedder();
    println!("Embedding model (all-MiniLM-L6-v2) loaded successfully.");

    let shared_state = Arc::new(AppState { embedder });

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
    stream: Option<bool>,
}

#[derive(Serialize)]
struct InferResponse {
    reply: String,
}

async fn infer_handler(Json(payload): Json<InferRequest>) -> String {
    // Handles local GGUF inference (or falls back to online LLM provider/heuristics)
    infer::infer_gguf(&payload.prompt, &payload.tier).await
}
