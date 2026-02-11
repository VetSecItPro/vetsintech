"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ParsedStudent {
  full_name: string;
  email: string;
}

interface BulkResult {
  created: number;
  errors: Array<{ email: string; error: string }>;
}

export function BulkEnroll() {
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, startImport] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        toast.error("Could not read the file");
        return;
      }

      const lines = text.split("\n").filter((line) => line.trim().length > 0);

      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        setParsedStudents([]);
        return;
      }

      // Parse header to find name and email columns
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = header.findIndex(
        (h) => h === "name" || h === "full_name" || h === "fullname"
      );
      const emailIdx = header.findIndex(
        (h) => h === "email" || h === "email_address"
      );

      if (nameIdx === -1 || emailIdx === -1) {
        toast.error(
          "CSV must have 'name' (or 'full_name') and 'email' columns"
        );
        setParsedStudents([]);
        return;
      }

      const students: ParsedStudent[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const full_name = cols[nameIdx] || "";
        const email = cols[emailIdx] || "";

        if (full_name && email) {
          students.push({ full_name, email });
        }
      }

      if (students.length === 0) {
        toast.error("No valid student rows found in the CSV");
      } else if (students.length > 50) {
        toast.error("Maximum 50 students per batch. Please split your CSV.");
        setParsedStudents(students.slice(0, 50));
      } else {
        setParsedStudents(students);
      }
    };

    reader.readAsText(file);
  }

  function handleImport() {
    if (parsedStudents.length === 0) return;

    startImport(async () => {
      try {
        const res = await fetch("/api/students/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: parsedStudents }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Bulk import failed");
        }

        const { data } = await res.json();
        setResult(data);

        if (data.errors.length === 0) {
          toast.success(`Successfully created ${data.created} students`);
        } else {
          toast.warning(
            `Created ${data.created} students, ${data.errors.length} failed`
          );
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to import students"
        );
      }
    });
  }

  function handleReset() {
    setParsedStudents([]);
    setResult(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {/* File input */}
      <div className="flex items-center gap-3">
        <Input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="max-w-sm bg-slate-800 border-slate-700 text-white file:text-slate-300"
        />
        {fileName && (
          <span className="flex items-center gap-1 text-sm text-slate-400">
            <FileText className="size-4" />
            {fileName}
          </span>
        )}
      </div>

      {/* Preview table */}
      {parsedStudents.length > 0 && !result && (
        <>
          <div className="text-sm text-slate-400">
            {parsedStudents.length} student{parsedStudents.length === 1 ? "" : "s"}{" "}
            parsed from CSV
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">#</TableHead>
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="text-slate-400">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedStudents.map((student, idx) => (
                <TableRow key={idx} className="border-slate-800">
                  <TableCell className="text-slate-500">{idx + 1}</TableCell>
                  <TableCell className="text-white">{student.full_name}</TableCell>
                  <TableCell className="text-slate-400">{student.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={importing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="size-4" />
              {importing ? "Importing..." : "Import"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={importing}
            >
              Cancel
            </Button>
          </div>
        </>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-green-400" />
            <span className="text-green-400">
              {result.created} student{result.created === 1 ? "" : "s"} created
              successfully
            </span>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="size-4 text-red-400" />
                <span className="text-red-400">
                  {result.errors.length} error{result.errors.length === 1 ? "" : "s"}
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.errors.map((err, idx) => (
                    <TableRow key={idx} className="border-slate-800">
                      <TableCell className="text-white">{err.email}</TableCell>
                      <TableCell className="text-red-400">{err.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Button variant="outline" onClick={handleReset}>
            Import Another File
          </Button>
        </div>
      )}
    </div>
  );
}
