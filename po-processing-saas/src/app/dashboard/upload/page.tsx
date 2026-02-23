'use client';

import { PdfDropzone } from '@/components/upload/pdf-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UploadPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload Purchase Orders</h2>
        <p className="text-muted-foreground">
          Upload one or more PO PDFs to extract data automatically using AI
        </p>
      </div>

      <PdfDropzone />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
          <CardDescription>The AI extraction pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Upload one or more PO PDFs at once</li>
            <li>Each file is processed sequentially through the extraction pipeline</li>
            <li>System auto-detects the vendor from document content</li>
            <li>AI extracts all line items, part numbers, quantities, and prices</li>
            <li>Parts are automatically matched against your mapping database</li>
            <li>High-confidence extractions are auto-approved; others go to review queue</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
