"use client";

import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { MessageSquare, Star, CheckCircle } from "lucide-react";

export default function FeedbackPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating !== null) {
      // Here you can add logic to send feedback to your backend
      console.log("Feedback submitted:", { rating, comment });
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setRating(null);
        setComment("");
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
        <MessageSquare className="h-5 w-5" />
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
                    ${rating === value
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
                  <Star
                    key={star}
                    className={`h-8 w-8 transition-colors duration-200 ${star <= rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                      }`}
                  />
                ))}
              </div>
            )}

            {/* Comment Area */}
            {rating !== null && (
              <div className="mb-6">
                <label
                  htmlFor="feedback-comment"
                  className="block text-sm font-medium text-[var(--foreground)] mb-2"
                >
                  Any comments? (optional)
                </label>
                <textarea
                  id="feedback-comment"
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-card)] text-[var(--foreground)]"
                  placeholder="Tell us what you like or what we can improve..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            )}

            {/* Submit button */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setRating(null);
                  setComment("");
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
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
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
