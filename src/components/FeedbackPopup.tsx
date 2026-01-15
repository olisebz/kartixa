"use client";

import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

export default function FeedbackPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating !== null) {
      // Here you can add logic to send feedback to your backend
      console.log("Feedback submitted:", rating);
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setRating(null);
      }, 2000);
    }
  };

  return (
    <>
      {/* Feedback button - fixed at bottom right */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2 z-40"
        aria-label="Give feedback"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        <span className="font-medium">Feedback</span>
      </button>

      {/* Feedback modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setRating(null);
          setSubmitted(false);
        }}
        title="We'd love your feedback!"
      >
        {!submitted ? (
          <div className="py-4">
            <p className="text-[var(--color-muted)] mb-6 text-center">
              How would you rate your experience?
            </p>

            {/* Rating circles */}
            <div className="flex justify-center gap-4 mb-6">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  className={`
                    w-14 h-14 rounded-full border-2 transition-all duration-200
                    flex items-center justify-center font-bold text-lg
                    ${
                      rating === value
                        ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white scale-110"
                        : "border-gray-300 text-gray-600 hover:border-[var(--color-primary)] hover:scale-105"
                    }
                  `}
                  aria-label={`Rate ${value} out of 5`}
                >
                  {value}
                </button>
              ))}
            </div>

            {/* Labels */}
            <div className="flex justify-between text-sm text-[var(--color-muted)] mb-6">
              <span>1 = Poor</span>
              <span>5 = Excellent</span>
            </div>

            {/* Star visualization */}
            {rating !== null && (
              <div className="flex justify-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-8 w-8 transition-colors duration-200 ${
                      star <= rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                ))}
              </div>
            )}

            {/* Submit button */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setRating(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={rating === null}>
                Submit Feedback
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-green-500 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Thank you!</h3>
            <p className="text-[var(--color-muted)]">
              Your feedback has been submitted successfully.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
