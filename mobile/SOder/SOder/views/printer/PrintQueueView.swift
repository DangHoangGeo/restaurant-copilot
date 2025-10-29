import SwiftUI

struct PrintQueueView: View {
    @ObservedObject private var queueManager = PrintQueueManager.shared
    @State private var showingClearAlert = false
    
    var body: some View {
            List {
                if queueManager.jobs.isEmpty {
                    ContentUnavailableView(
                        "print_queue_no_jobs".localized,
                        systemImage: "tray",
                        description: Text("print_queue_no_jobs_description".localized)
                    )
                } else {
                    // Queue Statistics
                    Section("print_queue_statistics".localized) {
                        StatisticsRow(
                            label: "print_queue_pending_jobs".localized,
                            value: queueManager.pendingJobsCount,
                            color: .appWarning
                        )
                        StatisticsRow(
                            label: "print_queue_failed_jobs".localized,
                            value: queueManager.failedJobsCount,
                            color: .appError
                        )
                        StatisticsRow(
                            label: "print_queue_completed_jobs".localized,
                            value: queueManager.completedJobsCount,
                            color: .appSuccess
                        )
                    }

                    // Print Jobs
                    Section("print_queue_title".localized) {
                        ForEach(queueManager.jobs.sorted(by: { $0.creationDate > $1.creationDate })) { job in
                            PrintJobRow(job: job) {
                                queueManager.retryJob(withId: job.id)
                            }
                        }
                        .onDelete(perform: deleteJobs)
                    }
                }
            }
            .navigationTitle("accessibility_print_queue_label".localized)
            .navigationBarTitleDisplayMode(.large)
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
    
    private func deleteJobs(at offsets: IndexSet) {
        let sortedJobs = queueManager.jobs.sorted(by: { $0.creationDate > $1.creationDate })
        for index in offsets {
            queueManager.removeJob(withId: sortedJobs[index].id)
        }
    }
}

struct PrintJobRow: View {
    let job: PrintJob
    let onRetry: () -> Void
    @State private var showingRemediationOptions = false

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(job.description)
                        .font(.headline)
                    
                    Spacer()
                    
                    HStack {
                        Circle()
                            .fill(job.status.color)
                            .frame(width: 8, height: 8)
                        
                        Text(job.status.displayName)
                            .font(.caption)
                            .foregroundColor(job.status.color)
                    }
                }
                
                Text(job.jobType.displayName)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                HStack {
                    Text(job.creationDate.formatted(.dateTime.hour().minute()))
                        .font(.caption)
                        .foregroundColor(.secondary)

                    if job.attempts > 0 {
                        Text(String(format: "print_queue_attempts_format".localized, job.attempts))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                if let errorMessage = job.errorMessage, job.status == .failed {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.appError)
                        .lineLimit(2)
                }
            }

            Spacer()

            if job.status == .failed {
                VStack(spacing: 4) {
                    Button("print_queue_retry".localized) {
                        onRetry()
                    }
                    .buttonStyle(.bordered)
                    .foregroundColor(.appInfo)
                    .accessibilityLabel("accessibility_retry_print_job_label".localized)
                    .accessibilityHint("accessibility_retry_print_job_hint".localized)

                    Button(action: {
                        showingRemediationOptions = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "wrench.and.screwdriver")
                                .font(.caption)
                            Text("print_queue_help".localized)
                                .font(.caption)
                        }
                    }
                    .buttonStyle(.borderless)
                    .foregroundColor(.appTextSecondary)
                }
            } else if job.status == .printing {
                ProgressView()
                    .scaleEffect(0.8)
                    .accessibilityLabel("print_queue_job_in_progress".localized)
            }
        }
        .padding(.vertical, 4)
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
}

struct StatisticsRow: View {
    let label: String
    let value: Int
    let color: Color
    
    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
            
            Spacer()
            
            HStack {
                Text("\(value)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(color)
                
                Circle()
                    .fill(color)
                    .frame(width: 8, height: 8)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value)")
    }
}

#Preview {
    PrintQueueView()
}
