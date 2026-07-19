"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  ArrowLeft,
  Clock,
} from "lucide-react";

import { useSetup } from "./setup-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TimetableSubject, TimetableEntry } from "@/types";
import { DAY_SHORT } from "@/types";
import { cn } from "@/lib/utils";

export function StepTimetableEdit() {
  const {
    subjects,
    timetable,
    setSubjects,
    setTimetable,
    nextStep,
    prevStep,
    saveTimetableData,
    isSubmitting,
  } = useSetup();

  const [subjectsList, setSubjectsList] = useState<TimetableSubject[]>(
    subjects.length > 0 ? subjects : [{ name: "", code: "", facultyName: "" }],
  );
  const [timetableList, setTimetableList] = useState<TimetableEntry[]>(
    timetable,
  );
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<TimetableEntry>>({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
    room: "",
    subjectIndex: 0,
  });

  const addSubject = useCallback(() => {
    setSubjectsList((prev) => [
      ...prev,
      { name: "", code: "", facultyName: "" },
    ]);
  }, []);

  const removeSubject = useCallback((index: number) => {
    setSubjectsList((prev) => prev.filter((_, i) => i !== index));
    setTimetableList((prev) =>
      prev
        .filter((e) => e.subjectIndex !== index)
        .map((e) => ({
          ...e,
          subjectIndex:
            e.subjectIndex > index ? e.subjectIndex - 1 : e.subjectIndex,
        })),
    );
  }, []);

  const updateSubject = useCallback(
    (
      index: number,
      field: keyof TimetableSubject,
      value: string,
    ) => {
      setSubjectsList((prev) =>
        prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  const addEntry = useCallback(() => {
    if (
      newEntry.subjectIndex !== undefined &&
      newEntry.dayOfWeek !== undefined &&
      newEntry.startTime &&
      newEntry.endTime
    ) {
      setTimetableList((prev) => [
        ...prev,
        newEntry as TimetableEntry,
      ]);
      setShowAddEntry(false);
      setNewEntry({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        room: "",
        subjectIndex: 0,
      });
    }
  }, [newEntry]);

  const removeEntry = useCallback((index: number) => {
    setTimetableList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setSubjects(subjectsList.filter((s) => s.name && s.code));
    setTimetable(timetableList);
    const success = await saveTimetableData();
    if (success) {
      nextStep();
    }
  }, [
    subjectsList,
    timetableList,
    setSubjects,
    setTimetable,
    saveTimetableData,
    nextStep,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight">Edit Timetable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your subjects and weekly schedule. You can edit these later.
        </p>
      </div>

      {/* Subjects Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Subjects</h3>
          <Button variant="outline" size="sm" onClick={addSubject}>
            <Plus className="h-4 w-4" />
            Add Subject
          </Button>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {subjectsList.map((subject, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border bg-card p-3"
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-2 h-4 w-4 text-muted-foreground" />
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Subject Name</Label>
                      <Input
                        value={subject.name}
                        onChange={(e) =>
                          updateSubject(index, "name", e.target.value)
                        }
                        placeholder="e.g. Data Structures"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Code</Label>
                      <Input
                        value={subject.code}
                        onChange={(e) =>
                          updateSubject(index, "code", e.target.value)
                        }
                        placeholder="e.g. CS301"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Faculty</Label>
                      <Input
                        value={subject.facultyName ?? ""}
                        onChange={(e) =>
                          updateSubject(index, "facultyName", e.target.value)
                        }
                        placeholder="e.g. Dr. Smith"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                  {subjectsList.length > 1 && (
                    <button
                      onClick={() => removeSubject(index)}
                      className="mt-2 rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Timetable Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Weekly Schedule</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddEntry(true)}
          >
            <Plus className="h-4 w-4" />
            Add Entry
          </Button>
        </div>

        {/* Group entries by day */}
        {DAY_SHORT.map((day, dayIndex) => {
          const dayEntries = timetableList
            .map((e, i) => ({ ...e, originalIndex: i }))
            .filter((e) => e.dayOfWeek === dayIndex);

          if (dayEntries.length === 0) return null;

          return (
            <div key={dayIndex} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {day}
              </p>
              <div className="space-y-1">
                {dayEntries.map((entry) => {
                  const subject = subjectsList[entry.subjectIndex];
                  return (
                    <motion.div
                      key={entry.originalIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                    >
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-xs">
                        {entry.startTime} - {entry.endTime}
                      </span>
                      <span className="flex-1 truncate font-medium">
                        {subject?.name || `Subject ${entry.subjectIndex + 1}`}
                      </span>
                      {entry.room && (
                        <span className="text-xs text-muted-foreground">
                          {entry.room}
                        </span>
                      )}
                      <button
                        onClick={() => removeEntry(entry.originalIndex)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {timetableList.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No timetable entries yet. Click &quot;Add Entry&quot; to start.
            </p>
          </div>
        )}
      </div>

      {/* Add Entry Dialog */}
      <AnimatePresence>
        {showAddEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowAddEntry(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-medium">Add Timetable Entry</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs">Subject</Label>
                  <select
                    value={newEntry.subjectIndex}
                    onChange={(e) =>
                      setNewEntry((prev) => ({
                        ...prev,
                        subjectIndex: Number(e.target.value),
                      }))
                    }
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {subjectsList.map((s, i) => (
                      <option key={i} value={i}>
                        {s.name || `Subject ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Day</Label>
                  <select
                    value={newEntry.dayOfWeek}
                    onChange={(e) =>
                      setNewEntry((prev) => ({
                        ...prev,
                        dayOfWeek: Number(e.target.value),
                      }))
                    }
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {DAY_SHORT.map((day, i) => (
                      <option key={i} value={i}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Start Time</Label>
                    <Input
                      type="time"
                      value={newEntry.startTime}
                      onChange={(e) =>
                        setNewEntry((prev) => ({
                          ...prev,
                          startTime: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End Time</Label>
                    <Input
                      type="time"
                      value={newEntry.endTime}
                      onChange={(e) =>
                        setNewEntry((prev) => ({
                          ...prev,
                          endTime: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Room (optional)</Label>
                  <Input
                    value={newEntry.room}
                    onChange={(e) =>
                      setNewEntry((prev) => ({
                        ...prev,
                        room: e.target.value,
                      }))
                    }
                    placeholder="e.g. Room 301"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddEntry(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={addEntry} className="flex-1">
                  Add Entry
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSave}
          disabled={
            isSubmitting ||
            subjectsList.filter((s) => s.name && s.code).length === 0
          }
        >
          {isSubmitting ? "Saving..." : "Save & Continue"}
          {!isSubmitting && <Save className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
