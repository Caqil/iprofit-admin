import os

def create_directory(path):
    os.makedirs(path, exist_ok=True)

def create_file(path):
    with open(path, 'w') as f:
        f.write('')  # Create an empty file

def generate_flutter_structure():
    base_dir = "lib"
    create_directory(base_dir)
    
    # Root files
    root_files = [
        "main.dart",
        "app.dart",
        "router.dart"
    ]
    for file in root_files:
        create_file(os.path.join(base_dir, file))
    
    # Core directory
    core_dir = os.path.join(base_dir, "core")
    core_subdirs = {
        "constants": [
            "api_constants.dart",
            "app_constants.dart",
            "storage_keys.dart",
            "route_constants.dart"
        ],
        "theme": [
            "app_theme.dart",
            "colors.dart"
        ],
        "utils": [
            "device_utils.dart",
            "date_utils.dart",
            "validators.dart",
            "extensions.dart"
        ],
        "errors": [
            "exceptions.dart",
            "failures.dart"
        ]
    }
    for subdir, files in core_subdirs.items():
        subdir_path = os.path.join(core_dir, subdir)
        create_directory(subdir_path)
        for file in files:
            create_file(os.path.join(subdir_path, file))
    
    # Data directory
    data_dir = os.path.join(base_dir, "data")
    data_subdirs = {
        "models": {
            "auth": [
                "login_request.dart",
                "login_response.dart",
                "signup_request.dart",
                "signup_response.dart"
            ],
            "user": [
                "user_model.dart",
                "profile_model.dart",
                "kyc_model.dart"
            ],
            "transaction": [
                "transaction_model.dart",
                "deposit_request.dart",
                "withdrawal_request.dart"
            ],
            "loan": [
                "loan_model.dart",
                "loan_request.dart",
                "emi_calculation.dart"
            ],
            "plan": ["plan_model.dart"],
            "notification": ["notification_model.dart"],
            "support": [
                "ticket_model.dart",
                "ticket_request.dart"
            ],
            "news": ["news_model.dart"],
            "referral": ["referral_model.dart"],
            "dashboard": ["dashboard_metrics.dart"]
        },
        "datasources": {
            "remote": [
                "api_client.dart",
                "auth_api.dart",
                "user_api.dart",
                "transaction_api.dart",
                "loan_api.dart",
                "plan_api.dart",
                "notification_api.dart",
                "support_api.dart",
                "news_api.dart",
                "referral_api.dart",
                "dashboard_api.dart"
            ],
            "local": [
                "storage_service.dart",
                "auth_storage.dart",
                "user_storage.dart",
                "app_data_storage.dart",
                "hive_adapters.dart"
            ]
        },
        "repositories": [
            "auth_repository.dart",
            "user_repository.dart",
            "transaction_repository.dart",
            "loan_repository.dart",
            "plan_repository.dart",
            "notification_repository.dart",
            "support_repository.dart",
            "news_repository.dart",
            "referral_repository.dart",
            "dashboard_repository.dart"
        ]
    }
    for subdir, content in data_subdirs.items():
        subdir_path = os.path.join(data_dir, subdir)
        create_directory(subdir_path)
        if isinstance(content, dict):
            for subsubdir, files in content.items():
                subsubdir_path = os.path.join(subdir_path, subsubdir)
                create_directory(subsubdir_path)
                for file in files:
                    create_file(os.path.join(subsubdir_path, file))
        else:
            for file in content:
                create_file(os.path.join(subdir_path, file))
    
    # Domain directory
    domain_dir = os.path.join(base_dir, "domain")
    domain_subdirs = {
        "entities": [
            "user_entity.dart",
            "transaction_entity.dart",
            "loan_entity.dart",
            "plan_entity.dart",
            "notification_entity.dart",
            "support_entity.dart",
            "news_entity.dart",
            "referral_entity.dart"
        ],
        "usecases": {
            "auth": [
                "login_usecase.dart",
                "signup_usecase.dart",
                "logout_usecase.dart",
                "refresh_token_usecase.dart"
            ],
            "user": [
                "get_profile_usecase.dart",
                "update_profile_usecase.dart",
                "upload_kyc_usecase.dart"
            ],
            "transaction": [
                "get_transactions_usecase.dart",
                "create_deposit_usecase.dart",
                "create_withdrawal_usecase.dart"
            ],
            "loan": [
                "get_loans_usecase.dart",
                "apply_loan_usecase.dart",
                "calculate_emi_usecase.dart"
            ],
            "dashboard": [
                "get_dashboard_data_usecase.dart"
            ]
        }
    }
    for subdir, content in domain_subdirs.items():
        subdir_path = os.path.join(domain_dir, subdir)
        create_directory(subdir_path)
        if isinstance(content, dict):
            for subsubdir, files in content.items():
                subsubdir_path = os.path.join(subdir_path, subsubdir)
                create_directory(subsubdir_path)
                for file in files:
                    create_file(os.path.join(subsubdir_path, file))
        else:
            for file in content:
                create_file(os.path.join(subdir_path, file))
    
    # Presentation directory
    presentation_dir = os.path.join(base_dir, "presentation")
    presentation_subdirs = {
        "providers": [
            "auth_provider.dart",
            "user_provider.dart",
            "transaction_provider.dart",
            "loan_provider.dart",
            "plan_provider.dart",
            "notification_provider.dart",
            "support_provider.dart",
            "news_provider.dart",
            "referral_provider.dart",
            "dashboard_provider.dart",
            "app_state_provider.dart"
        ],
        "screens": {
            "splash": ["splash_screen.dart"],
            "auth": [
                "login_screen.dart",
                "signup_screen.dart"
            ],
            "dashboard": ["dashboard_screen.dart"],
            "profile": [
                "profile_screen.dart",
                "edit_profile_screen.dart",
                "kyc_screen.dart"
            ],
            "transactions": [
                "transactions_screen.dart",
                "deposit_screen.dart",
                "withdrawal_screen.dart"
            ],
            "loans": [
                "loans_screen.dart",
                "apply_loan_screen.dart",
                "loan_details_screen.dart",
                "emi_calculator_screen.dart"
            ],
            "plans": ["plans_screen.dart"],
            "notifications": ["notifications_screen.dart"],
            "support": [
                "support_screen.dart",
                "create_ticket_screen.dart",
                "ticket_details_screen.dart"
            ],
            "news": [
                "news_screen.dart",
                "news_details_screen.dart"
            ],
            "referral": ["referral_screen.dart"],
            "settings": ["settings_screen.dart"]
        },
        "widgets": {
            "common": [
                "custom_app_bar.dart",
                "custom_bottom_nav.dart",
                "refresh_indicator_wrapper.dart",
                "error_widget.dart",
                "empty_state_widget.dart"
            ],
            "transaction": [
                "transaction_card.dart",
                "transaction_filter.dart"
            ],
            "loan": [
                "loan_card.dart",
                "emi_schedule_card.dart"
            ],
            "notification": ["notification_card.dart"],
            "dashboard": [
                "balance_card.dart",
                "quick_actions.dart",
                "recent_transactions.dart"
            ],
            "forms": [
                "custom_text_field.dart",
                "custom_dropdown.dart",
                "file_upload_widget.dart"
            ]
        }
    }
    for subdir, content in presentation_subdirs.items():
        subdir_path = os.path.join(presentation_dir, subdir)
        create_directory(subdir_path)
        if isinstance(content, dict):
            for subsubdir, files in content.items():
                subsubdir_path = os.path.join(subdir_path, subsubdir)
                create_directory(subsubdir_path)
                for file in files:
                    create_file(os.path.join(subsubdir_path, file))
        else:
            for file in content:
                create_file(os.path.join(subdir_path, file))
    
    # Services directory
    services_dir = os.path.join(base_dir, "services")
    create_directory(services_dir)
    services_files = [
        "api_service.dart",
        "storage_service.dart",
        "device_service.dart",
        "notification_service.dart",
        "biometric_service.dart"
    ]
    for file in services_files:
        create_file(os.path.join(services_dir, file))

if __name__ == "__main__":
    generate_flutter_structure()
    print("Flutter project structure generated successfully!")