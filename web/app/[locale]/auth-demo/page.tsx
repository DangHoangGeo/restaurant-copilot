"use client";

import React, { useState } from "react";
import { AuthCard, PasswordInput, FormField, PolicyAgreement } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { User, Mail } from "lucide-react";

// Simple test component to verify our auth components work
export default function AuthComponentsDemo() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [policyAgreed, setPolicyAgreed] = useState(false);

  return (
    <AuthCard 
      title="Authentication Components Demo"
      description="Testing our new reusable auth components"
    >
      <div className="space-y-4">
        <FormField
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail />}
          helpText="We'll never share your email with anyone"
        />

        <FormField
          label="Name"
          type="text"
          placeholder="Enter your full name"
          leftIcon={<User />}
        />

        <PasswordInput
          label="Password"
          placeholder="Create a secure password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showStrengthIndicator={true}
          showRequirements={true}
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          confirmPassword={password}
          showStrengthIndicator={false}
          showRequirements={false}
        />

        <PolicyAgreement
          checked={policyAgreed}
          onCheckedChange={setPolicyAgreed}
          showAsModal={true}
        />

        <Button className="w-full" disabled={!policyAgreed}>
          Create Account
        </Button>
      </div>
    </AuthCard>
  );
}
