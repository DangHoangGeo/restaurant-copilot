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
                return .appWarning
            case .printing:
                return .appInfo
            case .failed:
                return .appError
            case .completed:
                return .appSuccess
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
class PrintQueueManager: ObservableObject {
    static let shared = PrintQueueManager()
    
    @Published var jobs: [PrintJob] = []
    @Published var isProcessing = false
    
    private let maxQueueSize = 50
    private let maxRetries = 3
    private let userDefaults = UserDefaults.standard
    private let queueKey = "PrintQueueJobs"
    private let processingQueue = DispatchQueue(label: "print-queue-processing", qos: .userInitiated)
    
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
            await MainActor.run {
                isProcessing = true
            }
            
            defer {
                Task { @MainActor in
                    isProcessing = false
                }
            }
            
            while let nextJob = await getNextPendingJob() {
                await processJob(nextJob)
                
                // Small delay between jobs to prevent overwhelming the printer
                try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
            }
        }
    }
    
    private func getNextPendingJob() async -> PrintJob? {
        return await MainActor.run {
            jobs.first { $0.status == .pending }
        }
    }
    
    private func processJob(_ job: PrintJob) async {
        let index = await MainActor.run {
            jobs.firstIndex(where: { $0.id == job.id })
        }
        
        guard let validIndex = index else { return }
        
        // Update job status to printing
        await MainActor.run {
            if jobs.indices.contains(validIndex) {
                jobs[validIndex].status = .printing
                jobs[validIndex].attempts += 1
            }
        }
        await saveQueueAsync()
        
        do {
            // Execute the print job on background queue
            let currentJob = await MainActor.run { 
                jobs.indices.contains(validIndex) ? jobs[validIndex] : job 
            }
            try await PrinterService.shared.executePrintJob(currentJob)
            
            // Job completed successfully
            await MainActor.run {
                if jobs.indices.contains(validIndex) {
                    jobs[validIndex].status = .completed
                    jobs[validIndex].errorMessage = nil
                }
            }
            
        } catch {
            // Job failed
            await MainActor.run {
                if jobs.indices.contains(validIndex) {
                    jobs[validIndex].errorMessage = error.localizedDescription
                    
                    if jobs[validIndex].attempts < maxRetries {
                        // Retry the job
                        jobs[validIndex].status = .pending
                    } else {
                        // Max retries reached, mark as failed
                        jobs[validIndex].status = .failed
                    }
                }
            }
        }
        
        await saveQueueAsync()
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
    
    private func saveQueueAsync() async {
        let jobsCopy = await MainActor.run { jobs }
        
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            processingQueue.async {
                do {
                    let data = try JSONEncoder().encode(jobsCopy)
                    self.userDefaults.set(data, forKey: self.queueKey)
                } catch {
                    print("Failed to save print queue: \(error)")
                }
                continuation.resume()
            }
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

        // Determine the target printer based on job type
        let target = job.jobType.printTarget

        // Get the appropriate printer configuration
        let printerConfig: PrinterConfig.Hardware?
        switch target {
        case .kitchen:
            printerConfig = PrinterSettingsManager.shared.getKitchenPrinterConfig()
        case .receipt:
            printerConfig = PrinterSettingsManager.shared.getCheckoutPrinterConfig()
        }

        // Execute the print job with the appropriate target and configuration
        try await connectAndSendData(data: job.data, target: target, to: printerConfig)
    }
}

// MARK: - PrintJob.JobType Extension
extension PrintJob.JobType {
    var printTarget: PrinterSettingsManager.PrintTarget {
        switch self {
        case .kitchenOrder, .kitchenTest:
            return .kitchen
        case .customerReceipt, .testReceipt:
            return .receipt
        }
    }
}
