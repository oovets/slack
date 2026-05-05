import { contactsByGenderData } from "@/lib/constants";
import { SetStateAction } from "react";

type ContactsByGenderProps = {
  contactsByGender: typeof contactsByGenderData;
  setContactsByGender: (
    value: SetStateAction<typeof contactsByGenderData>,
  ) => void;
};

export function ContactsByGender({
  contactsByGender,
  setContactsByGender,
}: ContactsByGenderProps) {
  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-2 flex-1">
        <label className="border p-0.5">
          <input
            name="left-title"
            placeholder="title"
            value={contactsByGender.left.title}
            onChange={(e) => {
              const value = e.target.value;

              setContactsByGender((prev) => ({
                ...prev,
                left: { ...prev.left, title: value },
              }));
            }}
          />
        </label>
        <label className="border p-0.5">
          <input
            name="left-amount"
            placeholder="value"
            type="number"
            value={contactsByGender.left.number}
            onChange={(e) => {
              const value = e.target.value;

              setContactsByGender((prev) => ({
                ...prev,
                left: { ...prev.left, number: Number(value) },
              }));
            }}
          />
        </label>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <label className="border p-0.5">
          <input
            name="right-title"
            placeholder="title"
            type="text"
            value={contactsByGender.right.title}
            onChange={(e) => {
              const value = e.target.value;

              setContactsByGender((prev) => ({
                ...prev,
                right: { ...prev.right, title: value },
              }));
            }}
          />
        </label>
        <label className="border p-0.5">
          <input
            name="left-amount"
            placeholder="value"
            type="number"
            value={contactsByGender.right.number}
            onChange={(e) => {
              const value = e.target.value;

              setContactsByGender((prev) => ({
                ...prev,
                right: { ...prev.right, number: Number(value) },
              }));
            }}
          />
        </label>
      </div>
    </div>
  );
}
