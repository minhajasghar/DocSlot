import os

# Model configuration
MODEL_NAME = "mistral" # Assuming you have pulled 'mistral' in Ollama
OLLAMA_BASE_URL = "http://localhost:11434"

# Embedding configuration
EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"

# Dataset configuration
DATASET_NAME = "trivia_qa"
DATASET_CONFIG = "rc"
MAX_SAMPLES = 50 # Limit for initial testing

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "chroma_db")
