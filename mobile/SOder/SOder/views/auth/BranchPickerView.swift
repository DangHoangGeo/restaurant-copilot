import SwiftUI

struct BranchPickerView: View {
    @EnvironmentObject private var supabaseManager: SupabaseManager
    @EnvironmentObject private var localizationManager: LocalizationManager

    @State private var selectedBranch: Restaurant?
    @State private var isSigningOut = false
    @State private var showSignOutConfirm = false

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.appInfoLight.opacity(0.5),
                    Color.appBackground,
                    Color.appSurfaceSecondary.opacity(0.5)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                VStack(spacing: Spacing.sm) {
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color.appPrimary.opacity(0.15),
                                        Color.appPrimary.opacity(0.05)
                                    ]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 80, height: 80)
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.appPrimary)
                    }
                    .padding(.top, Spacing.xl)

                    Text("branch_picker_title".localized)
                        .font(.cardTitle)
                        .foregroundColor(.appTextPrimary)

                    Text("branch_picker_subtitle".localized)
                        .font(.bodyRegular)
                        .foregroundColor(.appTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, Spacing.xl)
                }
                .padding(.bottom, Spacing.lg)

                // Branch list
                ScrollView {
                    LazyVStack(spacing: Spacing.sm) {
                        if supabaseManager.accessibleBranches.isEmpty {
                            emptyState
                        } else {
                            ForEach(supabaseManager.accessibleBranches) { branch in
                                BranchRowView(
                                    branch: branch,
                                    isSelected: selectedBranch?.id == branch.id
                                )
                                .onTapGesture { selectedBranch = branch }
                                .accessibilityLabel(branch.name ?? branch.subdomain)
                                .accessibilityAddTraits(selectedBranch?.id == branch.id ? .isSelected : [])
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.md)
                }

                Spacer(minLength: 0)

                // Actions
                VStack(spacing: Spacing.sm) {
                    Button(action: confirmSelection) {
                        Text("branch_picker_continue_button".localized)
                            .font(.buttonLarge)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(
                                Group {
                                    if selectedBranch != nil {
                                        LinearGradient(
                                            gradient: Gradient(colors: [Color.appPrimary, Color.appPrimary.opacity(0.85)]),
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    } else {
                                        LinearGradient(
                                            gradient: Gradient(colors: [Color.appDisabled, Color.appDisabled]),
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    }
                                }
                            )
                            .foregroundColor(.white)
                            .cornerRadius(CornerRadius.md)
                            .shadow(
                                color: selectedBranch != nil ? Color.appPrimary.opacity(0.3) : Color.clear,
                                radius: 8,
                                y: 4
                            )
                    }
                    .disabled(selectedBranch == nil)
                    .accessibilityLabel("branch_picker_continue_button".localized)

                    Button(action: { showSignOutConfirm = true }) {
                        Text("branch_picker_sign_out".localized)
                            .font(.buttonMedium)
                            .foregroundColor(.appError)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                    }
                    .accessibilityLabel("branch_picker_sign_out".localized)
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.xl)
            }
        }
        .navigationBarHidden(true)
        .onAppear { preselectIfSingle() }
        .alert("branch_picker_sign_out".localized, isPresented: $showSignOutConfirm) {
            Button("branch_picker_sign_out".localized, role: .destructive) { signOut() }
            Button("cancel".localized, role: .cancel) {}
        }
    }

    private var emptyState: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "building.2.slash")
                .font(.system(size: 48))
                .foregroundColor(.appTextTertiary)
            Text("branch_picker_no_branches".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)
            Text("branch_picker_no_branches_subtitle".localized)
                .font(.bodyRegular)
                .foregroundColor(.appTextSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, Spacing.xxl)
        .frame(maxWidth: .infinity)
    }

    private func preselectIfSingle() {
        if supabaseManager.accessibleBranches.count == 1 {
            selectedBranch = supabaseManager.accessibleBranches[0]
        }
    }

    private func confirmSelection() {
        guard let branch = selectedBranch else { return }
        supabaseManager.selectBranch(branch)
    }

    private func signOut() {
        isSigningOut = true
        Task {
            try? await supabaseManager.signOut()
            isSigningOut = false
        }
    }
}

// MARK: - Branch Row

private struct BranchRowView: View {
    let branch: Restaurant
    let isSelected: Bool

    var body: some View {
        HStack(spacing: Spacing.md) {
            ZStack {
                Circle()
                    .fill(isSelected ? Color.appPrimary.opacity(0.15) : Color.appBackground)
                    .frame(width: 44, height: 44)
                Image(systemName: "storefront.fill")
                    .font(.body)
                    .foregroundColor(isSelected ? .appPrimary : .appTextSecondary)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(branch.name ?? branch.subdomain)
                    .font(.sectionHeader)
                    .foregroundColor(.appTextPrimary)
                if let code = branch.branchCode, !code.isEmpty {
                    Text(code)
                        .font(.captionRegular)
                        .foregroundColor(.appTextSecondary)
                } else {
                    Text(branch.subdomain)
                        .font(.captionRegular)
                        .foregroundColor(.appTextSecondary)
                }
            }

            Spacer()

            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title3)
                    .foregroundColor(.appPrimary)
            }
        }
        .padding(Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(isSelected ? Color.appPrimary.opacity(0.5) : Color.appBorderLight, lineWidth: isSelected ? 2 : 1)
        )
        .shadow(
            color: isSelected ? Color.appPrimary.opacity(0.1) : Elevation.level1.color,
            radius: isSelected ? 4 : Elevation.level1.radius,
            y: Elevation.level1.y
        )
        .animation(.spring(response: 0.25, dampingFraction: 0.8), value: isSelected)
    }
}

#Preview {
    BranchPickerView()
        .environmentObject(SupabaseManager.shared)
        .environmentObject(LocalizationManager.shared)
}
