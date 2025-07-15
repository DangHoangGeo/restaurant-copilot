import SwiftUI

struct PrintQueueView: View {
    @StateObject private var queueManager = PrintQueueManager.shared
    @State private var showingClearAlert = false
    
    var body: some View {
            List {
                if queueManager.jobs.isEmpty {
                    ContentUnavailableView(
                        "No Print Jobs",
                        systemImage: "tray",
                        description: Text("Print jobs will appear here when you print orders or receipts")
                    )
                } else {
                    // Queue Statistics
                    Section("Queue Statistics") {
                        StatisticsRow(
                            label: "Pending Jobs",
                            value: queueManager.pendingJobsCount,
                            color: .orange
                        )
                        StatisticsRow(
                            label: "Failed Jobs",
                            value: queueManager.failedJobsCount,
                            color: .red
                        )
                        StatisticsRow(
                            label: "Completed Jobs",
                            value: queueManager.completedJobsCount,
                            color: .green
                        )
                    }
                    
                    // Print Jobs
                    Section("Print Jobs") {
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
                            Button("Clear Completed Jobs") {
                                queueManager.clearCompletedJobs()
                            }
                            .disabled(queueManager.completedJobsCount == 0)
                            
                            Button("Clear All Jobs", role: .destructive) {
                                showingClearAlert = true
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
            }
            .alert("Clear All Jobs", isPresented: $showingClearAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Clear All", role: .destructive) {
                    queueManager.clearAllJobs()
                }
            } message: {
                Text("This will remove all print jobs from the queue. This action cannot be undone.")
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
                        Text("• Attempts: \(job.attempts)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let errorMessage = job.errorMessage, job.status == .failed {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                        .lineLimit(2)
                }
            }
            
            Spacer()
            
            if job.status == .failed {
                Button("Retry") {
                    onRetry()
                }
                .buttonStyle(.bordered)
                .foregroundColor(.blue)
                .accessibilityLabel("accessibility_retry_print_job_label".localized)
                .accessibilityHint("accessibility_retry_print_job_hint".localized)
            } else if job.status == .printing {
                ProgressView()
                    .scaleEffect(0.8)
                    .accessibilityLabel("Print job in progress")
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(job.description), \(job.jobType.displayName), \(job.status.displayName)")
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
