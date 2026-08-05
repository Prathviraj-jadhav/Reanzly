use fastembed::{EmbeddingModel, InitOptions, TextEmbedding};

pub fn build_embedder() -> TextEmbedding {
    TextEmbedding::try_new(InitOptions {
        model_name: EmbeddingModel::AllMiniLML6V2, // 22 MB auto-downloaded on first run
        show_download_progress: true,
        ..Default::default()
    })
    .expect("Failed to load embedding model")
}

pub fn embed_batch(embedder: &TextEmbedding, texts: Vec<String>) -> Vec<Vec<f32>> {
    embedder.embed(texts, None).expect("Embedding failed")
}
