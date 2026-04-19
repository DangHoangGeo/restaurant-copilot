import SwiftUI

struct PrintQueueView: View {
    @ObservedObject private var queueManager = PrintQueueManager.shared
    @State private var showingClearAlert = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                headerSection

                if queueManager.jobs.isEmpty {
                    ContentUnavailableView(
                        "print_queue_no_jobs".localized,
                        systemImage: "tray",
                        description: Text("print_queue_no_jobs_description".localized)
                    )
                    .frame(maxWidth: .infinity, minHeight: 280)
                    .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.xl, surfaceColor: Color.appSurface.opacity(0.96))
                } else {
                    statsSection

                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("print_queue_title".localized)
                            .font(.sectionHeader)
                            .foregroundColor(.appTextPrimary)

                        ForEach(sortedJobs) { job in
                            PrintJobRow(
                                job: job,
                                onRetry: { queueManager.retryJob(withId: job.id) },
                                onRemove: { queueManager.removeJob(withId: job.id) }
                            )
                        }
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
        .background(Color.appBackground.ignoresSafeArea())
        .navigationTitle("accessibility_print_queue_label".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                if !queueManager.jobs.isEmpty {
                    Menu {
                        Button("print_queue_clear_completed".localized) {
                            queueManager.clearCompletedJobs()
                        }
                        .disabled(queueManager.completedJobsCount == 0)

                        Button("print_queue_clear_all".localized, role: .destructive) {
                            showingClearAlert = true
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .alert("print_queue_clear_all".localized, isPresented: $showingClearAlert) {
            Button("cancel".localized, role: .cancel) { }
            Button("print_queue_clear_all".localized, role: .destructive) {
                queueManager.clearAllJobs()
            }
        } message: {
            Text("print_queue_clear_all_confirmation".localized)
        }
    }

    private var sortedJobs: [PrintJob] {
        queueManager.jobs.sorted(by: { $0.creationDate > $1.creationDate })
    }

    private var headerSection: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                AppSectionEyebrow("printing")

                Text("print_queue_title".localized)
                    .font(.heroTitle)
                    .foregroundColor(.appTextPrimary)

                Text("print_queue_subtitle".localized)
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
            }

            Spacer()

            if queueManager.isProcessing {
                AppHeaderPill("print_queue_processing_now".localized, tint: .appInfo)
            }
        }
    }

    private var statsSection: some View {
        HStack(spacing: Spacing.md) {
            StatisticsCard(
                label: "print_queue_pending_jobs".localized,
                value: queueManager.pendingJobsCount,
                color: .appWarning
            )
            StatisticsCard(
                label: "print_queue_failed_jobs".localized,
                value: queueManager.failedJobsCount,
                color: .appError
            )
            StatisticsCard(
                label: "print_queue_completed_jobs".localized,
                value: queueManager.completedJobsCount,
                color: .appSuccess
            )
        }
    }
}

struct PrintJobRow: View {
    let job: PrintJob
    let onRetry: () -> Void
    let onRemove: () -> Void
    @State private var showingRemediationOptions = false

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.sm) {
                        Text(job.jobType.displayName)
                            .font(.monoCaption)
                            .foregroundColor(.appTextSecondary)

                        Text(job.status.displayName.uppercased())
                            .modifier(StatusChipStyle(status: statusChipStatus, showIcon: true))
                    }

                    Text(job.description)
                        .font(.cardTitle)
                        .foregroundColor(.appTextPrimary)
                }

                Spacer()

                if job.status == .printing {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .accessibilityLabel("print_queue_job_in_progress".localized)
                }
            }

            HStack(spacing: Spacing.md) {
                queueMetaPill(icon: "clock", text: job.creationDate.formatted(.dateTime.hour().minute()))

                if job.attempts > 0 {
                    queueMetaPill(
                        icon: "arrow.triangle.2.circlepath",
                        text: String(format: "print_queue_attempts_format".localized, job.attempts)
                    )
                }
            }

            if let errorMessage = job.errorMessage, job.status == .failed {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.appError)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(Color.appError.opacity(0.08))
                    .cornerRadius(CornerRadius.md)
            }

            if job.status == .failed {
                HStack(spacing: Spacing.sm) {
                    Button("print_queue_retry".localized) {
                        onRetry()
                    }
                    .buttonStyle(SmallButtonStyle())
                    .accessibilityLabel("accessibility_retry_print_job_label".localized)
                    .accessibilityHint("accessibility_retry_print_job_hint".localized)

                    Button("print_queue_help".localized) {
                        showingRemediationOptions = true
                    }
                    .buttonStyle(SmallButtonStyle())
                }
            } else if job.status == .completed {
                HStack(spacing: Spacing.sm) {
                    Spacer()

                    Button("remove".localized) {
                        onRemove()
                    }
                    .buttonStyle(SmallButtonStyle())
                }
            }
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.94))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(job.description), \(job.jobType.displayName), \(job.status.displayName)")
        .confirmationDialog("print_queue_remediation_title".localized, isPresented: $showingRemediationOptions) {
            NavigationLink(destination: PrinterLogsView()) {
                Label("print_queue_view_logs".localized, systemImage: "doc.text.magnifyingglass")
            }

            NavigationLink(destination: UnifiedPrinterSetupView()) {
                Label("print_queue_reconfigure_printer".localized, systemImage: "printer")
            }

            Button("cancel".localized, role: .cancel) { }
        } message: {
            Text("print_queue_remediation_message".localized)
        }
    }

    private var statusChipStatus: StatusChipStatus {
        switch job.status {
        case .pending:
            return .warning
        case .printing:
            return .info
        case .failed:
            return .error
        case .completed:
            return .success
        }
    }

    private func queueMetaPill(icon: String, text: String) -> some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: icon)
            Text(text)
        }
        .font(.monoCaption)
        .foregroundColor(.appTextSecondary)
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
        .background(Color.appSurfaceSecondary)
        .cornerRadius(CornerRadius.sm)
    }
}

struct StatisticsCard: View {
    let label: String
    let value: Int
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(label)
                .font(.monoCaption)
                .foregroundColor(.appTextSecondary)

            HStack(spacing: Spacing.sm) {
                Circle()
                    .fill(color)
                    .frame(width: 10, height: 10)

                Text("\(value)")
                    .font(.cardTitle)
                    .foregroundColor(color)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.94))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value)")
    }
}

#Preview {
    NavigationView {
        PrintQueueView()
    }
}
