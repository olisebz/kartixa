"use client";

import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome to Kartixa! 🏁",
    description:
      "Your ultimate Go-Kart league management system. Track races, manage drivers, and keep standings all in one place.",
    icon: "🎯",
  },
  {
    title: "Create a League",
    description:
      "Start by creating a new league. Give it a name, description, and add your favorite tracks. You can always add more tracks later!",
    icon: "🏆",
  },
  {
    title: "Add Drivers",
    description:
      "Navigate to your league and go to the Drivers section. Add all participants who will be competing in your races.",
    icon: "👥",
  },
  {
    title: "Record Races",
    description:
      "Create new races by selecting a track and date. Then enter race results with positions, lap times, and mark the fastest lap!",
    icon: "🏎️",
  },
  {
    title: "Track Standings",
    description:
      "Points are calculated automatically based on positions. View the overall standings to see who's leading the championship!",
    icon: "📊",
  },
  {
    title: "Give Feedback",
    description:
      "Use the feedback button at the bottom-right to rate your experience and help us improve Kartixa!",
    icon: "💬",
  },
];

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Onboarding({ isOpen, onClose }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Getting Started">
      <div className="py-6">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-8 bg-[var(--color-primary)]"
                  : index < currentStep
                  ? "w-2 bg-[var(--color-primary)] opacity-50"
                  : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="text-center mb-8 min-h-[250px] flex flex-col items-center justify-center">
          <div className="text-6xl mb-4 animate-bounce">
            {currentStepData.icon}
          </div>
          <h3 className="text-2xl font-bold text-[var(--foreground)] mb-3">
            {currentStepData.title}
          </h3>
          <p className="text-[var(--color-muted)] text-lg max-w-md mx-auto">
            {currentStepData.description}
          </p>
        </div>

        {/* Step counter */}
        <div className="text-center text-sm text-[var(--color-muted)] mb-6">
          Step {currentStep + 1} of {steps.length}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose}>
              Skip
            </Button>
            <Button onClick={handleNext}>
              {isLastStep ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function OnboardingButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-card)] hover:bg-[var(--color-card-hover)] text-[var(--foreground)] transition-colors duration-200 border border-[var(--color-border)]"
        aria-label="Start onboarding tutorial"
      >
        <span className="text-xl">📖</span>
        <span className="font-medium">Quick Start Guide</span>
      </button>

      <Onboarding isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
