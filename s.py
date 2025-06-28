import os

def create_directory(path):
    os.makedirs(path, exist_ok=True)

def create_file(path, content=""):
    with open(path, 'w') as f:
        f.write(content)

def create_project_structure():
    # Root directory
    root = "admin-panel"
    create_directory(root)

    # App directory
    app_dir = os.path.join(root, "app")
    create_directory(app_dir)
    app_files = [
        "globals.css",
        "layout.tsx",
        "page.tsx",
        "loading.tsx",
        "error.tsx",
        "not-found.tsx"
    ]
    for file in app_files:
        create_file(os.path.join(app_dir, file))

    # Login directory
    login_dir = os.path.join(app_dir, "login")
    create_directory(login_dir)
    create_file(os.path.join(login_dir, "page.tsx"))
    login_components_dir = os.path.join(login_dir, "components")
    create_directory(login_components_dir)
    create_file(os.path.join(login_components_dir, "login-form.tsx"))

    # Dashboard directory
    dashboard_dir = os.path.join(app_dir, "dashboard")
    create_directory(dashboard_dir)
    dashboard_files = [
        "page.tsx",
        "layout.tsx"
    ]
    for file in dashboard_files:
        create_file(os.path.join(dashboard_dir, file))
    dashboard_components_dir = os.path.join(dashboard_dir, "components")
    create_directory(dashboard_components_dir)
    dashboard_component_files = [
        "dashboard-overview.tsx",
        "metrics-cards.tsx",
        "charts-section.tsx",
        "recent-activity.tsx"
    ]
    for file in dashboard_component_files:
        create_file(os.path.join(dashboard_components_dir, file))

    # Users directory
    users_dir = os.path.join(app_dir, "users")
    create_directory(users_dir)
    create_file(os.path.join(users_dir, "page.tsx"))
    users_id_dir = os.path.join(users_dir, "[id]")
    create_directory(users_id_dir)
    create_file(os.path.join(users_id_dir, "page.tsx"))
    users_edit_dir = os.path.join(users_id_dir, "edit")
    create_directory(users_edit_dir)
    create_file(os.path.join(users_edit_dir, "page.tsx"))
    users_components_dir = os.path.join(users_dir, "components")
    create_directory(users_components_dir)
    users_component_files = [
        "users-table.tsx",
        "user-profile.tsx",
        "kyc-verification.tsx",
        "user-actions.tsx",
        "transaction-history.tsx"
    ]
    for file in users_component_files:
        create_file(os.path.join(users_components_dir, file))

    # Transactions directory
    transactions_dir = os.path.join(app_dir, "transactions")
    create_directory(transactions_dir)
    create_file(os.path.join(transactions_dir, "page.tsx"))
    deposits_dir = os.path.join(transactions_dir, "deposits")
    create_directory(deposits_dir)
    create_file(os.path.join(deposits_dir, "page.tsx"))
    withdrawals_dir = os.path.join(transactions_dir, "withdrawals")
    create_directory(withdrawals_dir)
    create_file(os.path.join(withdrawals_dir, "page.tsx"))
    transactions_components_dir = os.path.join(transactions_dir, "components")
    create_directory(transactions_components_dir)
    transactions_component_files = [
        "transactions-table.tsx",
        "deposit-approval.tsx",
        "withdrawal-approval.tsx",
        "transaction-filters.tsx"
    ]
    for file in transactions_component_files:
        create_file(os.path.join(transactions_components_dir, file))

    # Referrals directory
    referrals_dir = os.path.join(app_dir, "referrals")
    create_directory(referrals_dir)
    create_file(os.path.join(referrals_dir, "page.tsx"))
    referrals_components_dir = os.path.join(referrals_dir, "components")
    create_directory(referrals_components_dir)
    referrals_component_files = [
        "referrals-overview.tsx",
        "referrals-table.tsx",
        "bonus-management.tsx"
    ]
    for file in referrals_component_files:
        create_file(os.path.join(referrals_components_dir, file))

    # Plans directory
    plans_dir = os.path.join(app_dir, "plans")
    create_directory(plans_dir)
    create_file(os.path.join(plans_dir, "page.tsx"))
    plans_id_dir = os.path.join(plans_dir, "[id]")
    create_directory(plans_id_dir)
    plans_edit_dir = os.path.join(plans_id_dir, "edit")
    create_directory(plans_edit_dir)
    create_file(os.path.join(plans_edit_dir, "page.tsx"))
    plans_components_dir = os.path.join(plans_dir, "components")
    create_directory(plans_components_dir)
    plans_component_files = [
        "plans-table.tsx",
        "plan-form.tsx",
        "plan-assignment.tsx"
    ]
    for file in plans_component_files:
        create_file(os.path.join(plans_components_dir, file))

    # Loans directory
    loans_dir = os.path.join(app_dir, "loans")
    create_directory(loans_dir)
    create_file(os.path.join(loans_dir, "page.tsx"))
    loans_applications_dir = os.path.join(loans_dir, "applications")
    create_directory(loans_applications_dir)
    create_file(os.path.join(loans_applications_dir, "page.tsx"))
    loans_id_dir = os.path.join(loans_dir, "[id]")
    create_directory(loans_id_dir)
    create_file(os.path.join(loans_id_dir, "page.tsx"))
    loans_components_dir = os.path.join(loans_dir, "components")
    create_directory(loans_components_dir)
    loans_component_files = [
        "loans-table.tsx",
        "loan-application-review.tsx",
        "emi-calculator.tsx",
        "credit-score-display.tsx",
        "repayment-schedule.tsx"
    ]
    for file in loans_component_files:
        create_file(os.path.join(loans_components_dir, file))

    # Tasks directory
    tasks_dir = os.path.join(app_dir, "tasks")
    create_directory(tasks_dir)
    create_file(os.path.join(tasks_dir, "page.tsx"))
    tasks_components_dir = os.path.join(tasks_dir, "components")
    create_directory(tasks_components_dir)
    tasks_component_files = [
        "tasks-table.tsx",
        "task-form.tsx",
        "submissions-review.tsx"
    ]
    for file in tasks_component_files:
        create_file(os.path.join(tasks_components_dir, file))

    # Notifications directory
    notifications_dir = os.path.join(app_dir, "notifications")
    create_directory(notifications_dir)
    create_file(os.path.join(notifications_dir, "page.tsx"))
    notifications_components_dir = os.path.join(notifications_dir, "components")
    create_directory(notifications_components_dir)
    notifications_component_files = [
        "notifications-list.tsx",
        "email-template.tsx",
        "notification-composer.tsx"
    ]
    for file in notifications_component_files:
        create_file(os.path.join(notifications_components_dir, file))

    # News directory
    news_dir = os.path.join(app_dir, "news")
    create_directory(news_dir)
    create_file(os.path.join(news_dir, "page.tsx"))
    news_create_dir = os.path.join(news_dir, "create")
    create_directory(news_create_dir)
    create_file(os.path.join(news_create_dir, "page.tsx"))
    news_id_dir = os.path.join(news_dir, "[id]")
    create_directory(news_id_dir)
    news_edit_dir = os.path.join(news_id_dir, "edit")
    create_directory(news_edit_dir)
    create_file(os.path.join(news_edit_dir, "page.tsx"))
    news_components_dir = os.path.join(news_dir, "components")
    create_directory(news_components_dir)
    news_component_files = [
        "news-table.tsx",
        "news-form.tsx"
    ]
    for file in news_component_files:
        create_file(os.path.join(news_components_dir, file))

    # Support directory
    support_dir = os.path.join(app_dir, "support")
    create_directory(support_dir)
    create_file(os.path.join(support_dir, "page.tsx"))
    tickets_dir = os.path.join(support_dir, "tickets")
    create_directory(tickets_dir)
    create_file(os.path.join(tickets_dir, "page.tsx"))
    tickets_id_dir = os.path.join(tickets_dir, "[id]")
    create_directory(tickets_id_dir)
    create_file(os.path.join(tickets_id_dir, "page.tsx"))
    chat_dir = os.path.join(support_dir, "chat")
    create_directory(chat_dir)
    create_file(os.path.join(chat_dir, "page.tsx"))
    faq_dir = os.path.join(support_dir, "faq")
    create_directory(faq_dir)
    create_file(os.path.join(faq_dir, "page.tsx"))
    support_components_dir = os.path.join(support_dir, "components")
    create_directory(support_components_dir)
    support_component_files = [
        "tickets-table.tsx",
        "ticket-details.tsx",
        "live-chat.tsx",
        "faq-manager.tsx"
    ]
    for file in support_component_files:
        create_file(os.path.join(support_components_dir, file))

    # Audit directory
    audit_dir = os.path.join(app_dir, "audit")
    create_directory(audit_dir)
    create_file(os.path.join(audit_dir, "page.tsx"))
    audit_components_dir = os.path.join(audit_dir, "components")
    create_directory(audit_components_dir)
    audit_component_files = [
        "audit-logs.tsx",
        "activity-timeline.tsx"
    ]
    for file in audit_component_files:
        create_file(os.path.join(audit_components_dir, file))

    # API directory
    api_dir = os.path.join(app_dir, "api")
    create_directory(api_dir)

    # Auth API
    auth_api_dir = os.path.join(api_dir, "auth")
    create_directory(auth_api_dir)
    auth_nextauth_dir = os.path.join(auth_api_dir, "[...nextauth]")
    create_directory(auth_nextauth_dir)
    create_file(os.path.join(auth_nextauth_dir, "route.ts"))
    auth_login_dir = os.path.join(auth_api_dir, "login")
    create_directory(auth_login_dir)
    create_file(os.path.join(auth_login_dir, "route.ts"))
    auth_signup_dir = os.path.join(auth_api_dir, "signup")
    create_directory(auth_signup_dir)
    create_file(os.path.join(auth_signup_dir, "route.ts"))
    auth_device_check_dir = os.path.join(auth_api_dir, "device-check")
    create_directory(auth_device_check_dir)
    create_file(os.path.join(auth_device_check_dir, "route.ts"))

    # Users API
    users_api_dir = os.path.join(api_dir, "users")
    create_directory(users_api_dir)
    create_file(os.path.join(users_api_dir, "route.ts"))
    users_id_dir = os.path.join(users_api_dir, "[id]")
    create_directory(users_id_dir)
    create_file(os.path.join(users_id_dir, "route.ts"))
    users_kyc_dir = os.path.join(users_id_dir, "kyc")
    create_directory(users_kyc_dir)
    create_file(os.path.join(users_kyc_dir, "route.ts"))
    users_transactions_dir = os.path.join(users_id_dir, "transactions")
    create_directory(users_transactions_dir)
    create_file(os.path.join(users_transactions_dir, "route.ts"))
    users_bulk_actions_dir = os.path.join(users_api_dir, "bulk-actions")
    create_directory(users_bulk_actions_dir)
    create_file(os.path.join(users_bulk_actions_dir, "route.ts"))

    # Transactions API
    transactions_api_dir = os.path.join(api_dir, "transactions")
    create_directory(transactions_api_dir)
    create_file(os.path.join(transactions_api_dir, "route.ts"))
    deposits_api_dir = os.path.join(transactions_api_dir, "deposits")
    create_directory(deposits_api_dir)
    create_file(os.path.join(deposits_api_dir, "route.ts"))
    deposits_approve_dir = os.path.join(deposits_api_dir, "approve")
    create_directory(deposits_approve_dir)
    create_file(os.path.join(deposits_approve_dir, "route.ts"))
    withdrawals_api_dir = os.path.join(transactions_api_dir, "withdrawals")
    create_directory(withdrawals_api_dir)
    create_file(os.path.join(withdrawals_api_dir, "route.ts"))
    withdrawals_approve_dir = os.path.join(withdrawals_api_dir, "approve")
    create_directory(withdrawals_approve_dir)
    create_file(os.path.join(withdrawals_approve_dir, "route.ts"))

    # Referrals API
    referrals_api_dir = os.path.join(api_dir, "referrals")
    create_directory(referrals_api_dir)
    create_file(os.path.join(referrals_api_dir, "route.ts"))
    bonuses_dir = os.path.join(referrals_api_dir, "bonuses")
    create_directory(bonuses_dir)
    create_file(os.path.join(bonuses_dir, "route.ts"))

    # Plans API
    plans_api_dir = os.path.join(api_dir, "plans")
    create_directory(plans_api_dir)
    create_file(os.path.join(plans_api_dir, "route.ts"))
    plans_id_api_dir = os.path.join(plans_api_dir, "[id]")
    create_directory(plans_id_api_dir)
    create_file(os.path.join(plans_id_api_dir, "route.ts"))

    # Loans API
    loans_api_dir = os.path.join(api_dir, "loans")
    create_directory(loans_api_dir)
    create_file(os.path.join(loans_api_dir, "route.ts"))
    loans_applications_api_dir = os.path.join(loans_api_dir, "applications")
    create_directory(loans_applications_api_dir)
    create_file(os.path.join(loans_applications_api_dir, "route.ts"))
    loans_emi_calculator_dir = os.path.join(loans_api_dir, "emi-calculator")
    create_directory(loans_emi_calculator_dir)
    create_file(os.path.join(loans_emi_calculator_dir, "route.ts"))
    loans_id_api_dir = os.path.join(loans_api_dir, "[id]")
    create_directory(loans_id_api_dir)
    create_file(os.path.join(loans_id_api_dir, "route.ts"))
    loans_repayment_dir = os.path.join(loans_id_api_dir, "repayment")
    create_directory(loans_repayment_dir)
    create_file(os.path.join(loans_repayment_dir, "route.ts"))

    # Tasks API
    tasks_api_dir = os.path.join(api_dir, "tasks")
    create_directory(tasks_api_dir)
    create_file(os.path.join(tasks_api_dir, "route.ts"))
    tasks_submissions_dir = os.path.join(tasks_api_dir, "submissions")
    create_directory(tasks_submissions_dir)
    create_file(os.path.join(tasks_submissions_dir, "route.ts"))

    # Notifications API
    notifications_api_dir = os.path.join(api_dir, "notifications")
    create_directory(notifications_api_dir)
    create_file(os.path.join(notifications_api_dir, "route.ts"))
    notifications_send_dir = os.path.join(notifications_api_dir, "send")
    create_directory(notifications_send_dir)
    create_file(os.path.join(notifications_send_dir, "route.ts"))

    # News API
    news_api_dir = os.path.join(api_dir, "news")
    create_directory(news_api_dir)
    create_file(os.path.join(news_api_dir, "route.ts"))
    news_id_api_dir = os.path.join(news_api_dir, "[id]")
    create_directory(news_id_api_dir)
    create_file(os.path.join(news_id_api_dir, "route.ts"))

    # Support API
    support_api_dir = os.path.join(api_dir, "support")
    create_directory(support_api_dir)
    support_tickets_dir = os.path.join(support_api_dir, "tickets")
    create_directory(support_tickets_dir)
    create_file(os.path.join(support_tickets_dir, "route.ts"))
    support_tickets_id_dir = os.path.join(support_tickets_dir, "[id]")
    create_directory(support_tickets_id_dir)
    create_file(os.path.join(support_tickets_id_dir, "route.ts"))
    support_chat_dir = os.path.join(support_api_dir, "chat")
    create_directory(support_chat_dir)
    create_file(os.path.join(support_chat_dir, "route.ts"))
    support_faq_dir = os.path.join(support_api_dir, "faq")
    create_directory(support_faq_dir)
    create_file(os.path.join(support_faq_dir, "route.ts"))

    # Audit API
    audit_api_dir = os.path.join(api_dir, "audit")
    create_directory(audit_api_dir)
    create_file(os.path.join(audit_api_dir, "route.ts"))

    # Dashboard API
    dashboard_api_dir = os.path.join(api_dir, "dashboard")
    create_directory(dashboard_api_dir)
    dashboard_metrics_dir = os.path.join(dashboard_api_dir, "metrics")
    create_directory(dashboard_metrics_dir)
    create_file(os.path.join(dashboard_metrics_dir, "route.ts"))
    dashboard_charts_dir = os.path.join(dashboard_api_dir, "charts")
    create_directory(dashboard_charts_dir)
    create_file(os.path.join(dashboard_charts_dir, "route.ts"))

    # Components directory
    components_dir = os.path.join(root, "components")
    create_directory(components_dir)

    # UI components
    ui_components_dir = os.path.join(components_dir, "ui")
    create_directory(ui_components_dir)
    ui_component_files = [
        "button.tsx",
        "input.tsx",
        "label.tsx",
        "card.tsx",
        "table.tsx",
        "dialog.tsx",
        "dropdown-menu.tsx",
        "form.tsx",
        "select.tsx",
        "textarea.tsx",
        "toast.tsx",
        "badge.tsx",
        "avatar.tsx",
        "separator.tsx",
        "skeleton.tsx",
        "alert.tsx",
        "tabs.tsx",
        "checkbox.tsx",
        "radio-group.tsx",
        "switch.tsx",
        "progress.tsx",
        "sheet.tsx",
        "calendar.tsx"
    ]
    for file in ui_component_files:
        create_file(os.path.join(ui_components_dir, file))

    # Layout components
    layout_components_dir = os.path.join(components_dir, "layout")
    create_directory(layout_components_dir)
    layout_component_files = [
        "header.tsx",
        "sidebar.tsx",
        "navigation.tsx",
        "breadcrumb.tsx",
        "footer.tsx"
    ]
    for file in layout_component_files:
        create_file(os.path.join(layout_components_dir, file))

    # Auth components
    auth_components_dir = os.path.join(components_dir, "auth")
    create_directory(auth_components_dir)
    auth_component_files = [
        "login-form.tsx",
        "protected-route.tsx",
        "role-guard.tsx"
    ]
    for file in auth_component_files:
        create_file(os.path.join(auth_components_dir, file))

    # Shared components
    shared_components_dir = os.path.join(components_dir, "shared")
    create_directory(shared_components_dir)
    shared_component_files = [
        "data-table.tsx",
        "pagination.tsx",
        "search-input.tsx",
        "date-picker.tsx",
        "loading-spinner.tsx",
        "error-boundary.tsx",
        "confirmation-dialog.tsx",
        "file-upload.tsx"
    ]
    for file in shared_component_files:
        create_file(os.path.join(shared_components_dir, file))

    # Charts components
    charts_components_dir = os.path.join(components_dir, "charts")
    create_directory(charts_components_dir)
    charts_component_files = [
        "line-chart.tsx",
        "bar-chart.tsx",
        "pie-chart.tsx",
        "area-chart.tsx"
    ]
    for file in charts_component_files:
        create_file(os.path.join(charts_components_dir, file))

    # Types directory
    types_dir = os.path.join(root, "types")
    create_directory(types_dir)
    types_files = [
        "index.ts",
        "auth.ts",
        "user.ts",
        "transaction.ts",
        "referral.ts",
        "plan.ts",
        "loan.ts",
        "task.ts",
        "notification.ts",
        "news.ts",
        "support.ts",
        "dashboard.ts",
        "api.ts"
    ]
    for file in types_files:
        create_file(os.path.join(types_dir, file))

    # Lib directory
    lib_dir = os.path.join(root, "lib")
    create_directory(lib_dir)
    lib_files = [
        "auth.ts",
        "db.ts",
        "mongodb.ts",
        "device-detection.ts",
        "email.ts",
        "validation.ts",
        "utils.ts",
        "constants.ts",
        "permissions.ts",
        "rate-limit.ts",
        "encryption.ts",
        "api-helpers.ts"
    ]
    for file in lib_files:
        create_file(os.path.join(lib_dir, file))

    # Models directory
    models_dir = os.path.join(root, "models")
    create_directory(models_dir)
    models_files = [
        "Admin.ts",
        "User.ts",
        "Transaction.ts",
        "Referral.ts",
        "Plan.ts",
        "Loan.ts",
        "Task.ts",
        "Notification.ts",
        "News.ts",
        "SupportTicket.ts",
        "AuditLog.ts"
    ]
    for file in models_files:
        create_file(os.path.join(models_dir, file))

    # Middleware directory
    middleware_dir = os.path.join(root, "middleware")
    create_directory(middleware_dir)
    middleware_files = [
        "auth.ts",
        "rate-limit.ts",
        "device-check.ts",
        "validation.ts",
        "error-handler.ts"
    ]
    for file in middleware_files:
        create_file(os.path.join(middleware_dir, file))

    # Hooks directory
    hooks_dir = os.path.join(root, "hooks")
    create_directory(hooks_dir)
    hooks_files = [
        "use-auth.ts",
        "use-dashboard.ts",
        "use-users.ts",
        "use-transactions.ts",
        "use-loans.ts",
        "use-notifications.ts",
        "use-debounce.ts"
    ]
    for file in hooks_files:
        create_file(os.path.join(hooks_dir, file))

    # Providers directory
    providers_dir = os.path.join(root, "providers")
    create_directory(providers_dir)
    providers_files = [
        "auth-provider.tsx",
        "query-provider.tsx",
        "toast-provider.tsx",
        "theme-provider.tsx"
    ]
    for file in providers_files:
        create_file(os.path.join(providers_dir, file))

    # Utils directory
    utils_dir = os.path.join(root, "utils")
    create_directory(utils_dir)
    utils_files = [
        "api.ts",
        "formatters.ts",
        "validators.ts",
        "constants.ts",
        "helpers.ts",
        "date.ts"
    ]
    for file in utils_files:
        create_file(os.path.join(utils_dir, file))

    # Config directory
    config_dir = os.path.join(root, "config")
    create_directory(config_dir)
    config_files = [
        "database.ts",
        "auth.ts",
        "email.ts",
        "oauth.ts",
        "env.ts"
    ]
    for file in config_files:
        create_file(os.path.join(config_dir, file))

    # Docs directory
    docs_dir = os.path.join(root, "docs")
    create_directory(docs_dir)
    docs_api_dir = os.path.join(docs_dir, "api")
    create_directory(docs_api_dir)
    docs_api_files = [
        "swagger.json",
        "README.md"
    ]
    for file in docs_api_files:
        create_file(os.path.join(docs_api_dir, file))
    docs_setup_dir = os.path.join(docs_dir, "setup")
    create_directory(docs_setup_dir)
    docs_setup_files = [
        "installation.md",
        "configuration.md",
        "deployment.md"
    ]
    for file in docs_setup_files:
        create_file(os.path.join(docs_setup_dir, file))
    docs_features_dir = os.path.join(docs_dir, "features")
    create_directory(docs_features_dir)
    docs_features_files = [
        "authentication.md",
        "user-management.md",
        "loan-system.md",
        "device-limiting.md"
    ]
    for file in docs_features_files:
        create_file(os.path.join(docs_features_dir, file))

    # Tests directory
    tests_dir = os.path.join(root, "tests")
    create_directory(tests_dir)
    tests_mocks_dir = os.path.join(tests_dir, "__mocks__")
    create_directory(tests_mocks_dir)
    tests_api_dir = os.path.join(tests_dir, "api")
    create_directory(tests_api_dir)
    tests_api_files = [
        "auth.test.ts",
        "users.test.ts",
        "transactions.test.ts",
        "loans.test.ts"
    ]
    for file in tests_api_files:
        create_file(os.path.join(tests_api_dir, file))
    tests_components_dir = os.path.join(tests_dir, "components")
    create_directory(tests_components_dir)
    tests_components_files = [
        "login-form.test.tsx",
        "users-table.test.tsx",
        "dashboard.test.tsx"
    ]
    for file in tests_components_files:
        create_file(os.path.join(tests_components_dir, file))
    tests_lib_dir = os.path.join(tests_dir, "lib")
    create_directory(tests_lib_dir)
    tests_lib_files = [
        "auth.test.ts",
        "device-detection.test.ts",
        "validation.test.ts"
    ]
    for file in tests_lib_files:
        create_file(os.path.join(tests_lib_dir, file))
    create_file(os.path.join(tests_dir, "setup.ts"))

    # Scripts directory
    scripts_dir = os.path.join(root, "scripts")
    create_directory(scripts_dir)
    scripts_files = [
        "seed-data.ts",
        "migrate-db.ts",
        "generate-docs.ts",
        "setup-env.ts"
    ]
    for file in scripts_files:
        create_file(os.path.join(scripts_dir, file))

    # Public directory
    public_dir = os.path.join(root, "public")
    create_directory(public_dir)
    public_files = [
        "favicon.ico",
        "manifest.json"
    ]
    for file in public_files:
        create_file(os.path.join(public_dir, file))
    public_icons_dir = os.path.join(public_dir, "icons")
    create_directory(public_icons_dir)
    public_images_dir = os.path.join(public_dir, "images")
    create_directory(public_images_dir)

if __name__ == "__main__":
    create_project_structure()
    print("Admin panel project structure created successfully!")