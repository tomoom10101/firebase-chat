terraform {
  backend "gcs" {
    bucket = "fir-chat-4e112-tfstate"
    prefix = "terraform/state"
  }
}
