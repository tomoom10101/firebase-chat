provider "google" {
  project = "fir-chat-4e112"
  region  = "asia-northeast1"
}

provider "google" {
  alias       = "billing"
  project     = "fir-chat-4e112"
  region      = "asia-northeast1"
  credentials = try(file(pathexpand("~/terraform-billing-key.json")), null)
}

resource "google_cloud_run_v2_service" "firebase_chat" {
  name     = "firebase-chat"
  location = "asia-northeast1"

  template {
    service_account = google_service_account.firebase_chat_runtime.email

    containers {
      image = "asia-northeast1-docker.pkg.dev/fir-chat-4e112/firebase-chat/firebase-chat:latest"

      env {
        name = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.anthropic_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

resource "google_monitoring_dashboard" "firebase_chat_dashboard" {
  dashboard_json = jsonencode({
    displayName = "firebase-chat Dashboard"
    gridLayout = {
      widgets = [
        {
          title = "Request Count"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"firebase-chat\" AND metric.type=\"run.googleapis.com/request_count\""
                }
              }
            }]
          }
        }
        ,
        {
          title = "Error Count"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"firebase-chat\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
                }
              }
            }]
          }
        }
        ,
        {
          title = "Latency"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"firebase-chat\" AND metric.type=\"run.googleapis.com/request_latencies\""
                }
              }
            }]
          }
        }
      ]
    }
  })
}

variable "notification_email" {
  sensitive = true
}

resource "google_monitoring_notification_channel" "email_channel" {
  display_name = "Email Notification"
  type         = "email"
  labels = {
    email_address = var.notification_email
  }
}

resource "google_monitoring_alert_policy" "error_alert" {
  display_name = "Error Rate Alert"
  combiner     = "OR"

  conditions {
    display_name = "5xx errors"
    condition_threshold {
      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"firebase-chat\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      aggregations {
        alignment_period   = "600s"
        per_series_aligner = "ALIGN_SUM"
      }
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      duration        = "60s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.email_channel.id
  ]
}

resource "google_billing_budget" "monthly_budget" {
  provider        = google.billing
  billing_account = var.billing_account_id
  display_name    = "firebase-chat Monthly Budget"

  amount {
    specified_amount {
      currency_code = "JPY"
      units         = "1000"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }

  threshold_rules {
    threshold_percent = 0.9
  }

  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email_channel.id
    ]
  }
}

resource "google_service_account" "terraform_billing" {
  account_id   = "terraform-billing"
  display_name = "Terraform Billing Budget"
}

resource "google_project_iam_member" "billing_sa_channel_viewer" {
  project = "fir-chat-4e112"
  role    = "roles/monitoring.notificationChannelViewer"
  member  = "serviceAccount:${google_service_account.terraform_billing.email}"
}

resource "google_billing_account_iam_member" "billing_sa_admin" {
  billing_account_id = var.billing_account_id
  role               = "roles/billing.costsManager"
  member             = "serviceAccount:${google_service_account.terraform_billing.email}"
}
resource "google_service_account" "github_deployer" {
  account_id   = "github-deployer"
  display_name = "GitHub Actions Deployer"
}

resource "google_artifact_registry_repository_iam_member" "deployer_ar_writer" {
  project    = "fir-chat-4e112"
  location   = "asia-northeast1"
  repository = "firebase-chat"
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.github_deployer.email}"
}

resource "google_cloud_run_v2_service_iam_member" "deployer_run_developer" {
  project  = "fir-chat-4e112"
  location = "asia-northeast1"
  name     = google_cloud_run_v2_service.firebase_chat.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.github_deployer.email}"
}

resource "google_service_account_iam_member" "deployer_act_as_runtime" {
  service_account_id = "projects/fir-chat-4e112/serviceAccounts/648105866948-compute@developer.gserviceaccount.com"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer.email}"
}
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  attribute_condition = "attribute.repository == \"tomoom10101/firebase-chat\""
}

resource "google_service_account_iam_member" "github_wif_deployer" {
  service_account_id = google_service_account.github_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/tomoom10101/firebase-chat"
}

output "wif_provider_name" {
  value = google_iam_workload_identity_pool_provider.github.name
}

variable "billing_account_id" {
  type = string
}

# ===== Secret Manager（2026-11-28） =====

# 1. Secret Manager の API を有効にする
resource "google_project_service" "secretmanager" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# 2. 箱（中身は gcloud で入れる）
resource "google_secret_manager_secret" "anthropic_key" {
  secret_id = "anthropic-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.secretmanager]
}

# 3. Cloud Run 専用の実行用 SA
resource "google_service_account" "firebase_chat_runtime" {
  account_id   = "firebase-chat-runtime"
  display_name = "firebase-chat Cloud Run runtime"
}

# 4. 実行用 SA に、箱を読む許可
resource "google_secret_manager_secret_iam_member" "runtime_can_read_anthropic_key" {
  secret_id = google_secret_manager_secret.anthropic_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.firebase_chat_runtime.email}"
}

# 5. github-deployer に、実行用 SA として働く許可
resource "google_service_account_iam_member" "deployer_act_as_firebase_chat_runtime" {
  service_account_id = google_service_account.firebase_chat_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer.email}"
}
