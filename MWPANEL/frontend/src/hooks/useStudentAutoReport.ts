import { useState, useCallback } from 'react';
import { studentAutoReportService } from '@/services/studentAutoReportService';
import {
  StudentAutoReportOptions, StudentAutoReportResult, GenerateAutoReportBody,
} from '@/types/studentAutoReport';

export function useStudentAutoReport() {
  const [options, setOptions] = useState<StudentAutoReportOptions | null>(null);
  const [report, setReport] = useState<StudentAutoReportResult | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async (studentId: string) => {
    setLoadingOptions(true); setError(null);
    try { setOptions(await studentAutoReportService.getOptions(studentId)); }
    catch (e: any) { setError(e?.message || 'Error al cargar opciones'); }
    finally { setLoadingOptions(false); }
  }, []);

  const generate = useCallback(async (body: GenerateAutoReportBody) => {
    setGenerating(true); setError(null);
    try { setReport(await studentAutoReportService.generate(body)); }
    catch (e: any) { setError(e?.message || 'Error al generar el informe'); }
    finally { setGenerating(false); }
  }, []);

  const downloadPdf = useCallback(async (body: GenerateAutoReportBody, studentName: string) => {
    setDownloading(true); setError(null);
    try { await studentAutoReportService.downloadPdf(body, studentName); }
    catch (e: any) { setError(e?.message || 'Error al descargar el PDF'); }
    finally { setDownloading(false); }
  }, []);

  const reset = useCallback(() => { setReport(null); setOptions(null); setError(null); }, []);

  return { options, report, loadingOptions, generating, downloading, error, loadOptions, generate, downloadPdf, reset };
}
