import Foundation
import SwiftUI

// MARK: - Print Job Model
struct PrintJob: Identifiable, Codable {
    let id: UUID
    var data: Data
    var status: Status
    var creationDate: Date
    var attempts: Int
    var errorMessage: String?
    var jobType: JobType
    var description: String
    
    enum Status: String, Codable, CaseIterable {
        case pending = "pending"
        case printing = "printing"
        case failed = "failed"
        case completed = "completed"
        
        var displayName: String {
            switch self {
            case .pending:
                return "accessibility_print_job_pending_label".localized
            case .printing:
                return "accessibility_print_job_printing_label".localized
            case .failed:
                return "accessibility_print_job_failed_label".localized
            case .completed:
                return "accessibility_print_job_completed_label".localized
            }
        }
        
        var color: Color {
            switch self {
            case .pending:
                return .orange
            case .printing:
                return .blue
            case .failed:
                return .red
            case .completed:
                return .green
            }
        }
    }
    
    enum JobType: String, Codable {
        case kitchenOrder = "kitchen_order"
        case customerReceipt = "customer_receipt"
        case testReceipt = "test_receipt"
        case kitchenTest = "kitchen_test"
        
        var displayName: String {
            switch self {
            case .kitchenOrder:
                return "Kitchen Order"
            case .customerReceipt:
                return "Customer Receipt"
            case .testReceipt:
                return "Test Receipt"
            case .kitchenTest:
                return "Kitchen Test"
            }
        }
    }
    
    init(data: Data, jobType: JobType, description: String) {
        self.id = UUID()
        self.data = data
        self.status = .pending
        self.creationDate = Date()
        self.attempts = 0
        self.errorMessage = nil
        self.jobType = jobType
        self.description = description
    }
}

// MARK: - Print Queue Manager
@MainActor
class PrintQueueManager: ObservableObject {
    static let shared = PrintQueueManager()
    
    @Published var jobs: [PrintJob] = []
    @Published var isProcessing = false
    
    private let maxQueueSize = 50
    private let maxRetries = 3
    private let userDefaults = UserDefaults.standard
    private let queueKey = "PrintQueueJobs"
    
    private init() {
        loadQueue()
        startProcessing()
    }
    
    // MARK: - Queue Management
    
    func enqueue(data: Data, jobType: PrintJob.JobType, description: String) throws {
        guard jobs.count < maxQueueSize else {
            throw PrinterError.queueFull
        }
        
        let job = PrintJob(data: data, jobType: jobType, description: description)
        jobs.append(job)
        saveQueue()
        
        // Start processing if not already running
        if !isProcessing {
            processQueue()
        }
    }
    
    func retryJob(withId id: UUID) {
        guard let index = jobs.firstIndex(where: { $0.id == id }) else { return }
        
        jobs[index].status = .pending
        jobs[index].attempts = 0
        jobs[index].errorMessage = nil
        saveQueue()
        
        // Start processing if not already running
        if !isProcessing {
            processQueue()
        }
    }
    
    func removeJob(withId id: UUID) {
        jobs.removeAll { $0.id == id }
        saveQueue()
    }
    
    func clearCompletedJobs() {
        jobs.removeAll { $0.status == .completed }
        saveQueue()
    }
    
    func clearAllJobs() {
        jobs.removeAll()
        saveQueue()
    }
    
    // MARK: - Queue Processing
    
    private func processQueue() {
        guard !isProcessing else { return }
        
        Task {
            isProcessing = true
            defer { isProcessing = false }
            
            while let nextJob = getNextPendingJob() {
                await processJob(nextJob)
                
                // Small delay between jobs to prevent overwhelming the printer
                try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
            }
        }
    }
    
    private func getNextPendingJob() -> PrintJob? {
        return jobs.first { $0.status == .pending }
    }
    
    private func processJob(_ job: PrintJob) async {
        guard let index = jobs.firstIndex(where: { $0.id == job.id }) else { return }
        
        // Update job status to printing
        jobs[index].status = .printing
        jobs[index].attempts += 1
        saveQueue()
        
        do {
            // Execute the print job
            try await PrinterService.shared.executePrintJob(jobs[index])
            
            // Job completed successfully
            jobs[index].status = .completed
            jobs[index].errorMessage = nil
            
        } catch {
            // Job failed
            jobs[index].errorMessage = error.localizedDescription
            
            if jobs[index].attempts < maxRetries {
                // Retry the job
                jobs[index].status = .pending
            } else {
                // Max retries reached, mark as failed
                jobs[index].status = .failed
            }
        }
        
        saveQueue()
    }
    
    private func startProcessing() {
        // Process any pending jobs on startup
        if jobs.contains(where: { $0.status == .pending }) {
            processQueue()
        }
    }
    
    // MARK: - Persistence
    
    private func saveQueue() {
        do {
            let data = try JSONEncoder().encode(jobs)
            userDefaults.set(data, forKey: queueKey)
        } catch {
            print("Failed to save print queue: \(error)")
        }
    }
    
    private func loadQueue() {
        guard let data = userDefaults.data(forKey: queueKey) else { return }
        
        do {
            jobs = try JSONDecoder().decode([PrintJob].self, from: data)
            
            // Reset printing status on app restart
            for index in jobs.indices {
                if jobs[index].status == .printing {
                    jobs[index].status = .pending
                }
            }
        } catch {
            print("Failed to load print queue: \(error)")
            jobs = []
        }
    }
    
    // MARK: - Statistics
    
    var pendingJobsCount: Int {
        jobs.filter { $0.status == .pending }.count
    }
    
    var failedJobsCount: Int {
        jobs.filter { $0.status == .failed }.count
    }
    
    var completedJobsCount: Int {
        jobs.filter { $0.status == .completed }.count
    }
}

// MARK: - PrinterService Extensions
extension PrinterService {
    func executePrintJob(_ job: PrintJob) async throws {
        guard !job.data.isEmpty else {
            throw PrinterError.invalidJobData
        }
        
        try await connectAndSendData(data: job.data)
    }
}
