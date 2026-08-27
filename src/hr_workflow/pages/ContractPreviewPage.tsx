import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hrApi } from '../api/hrApi';
import { fillContractTemplate } from '../utils/contractPdf';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';

export function ContractPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, t } = useHrLanguage();
  const employeeId = Number(id);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['hr-employee', employeeId],
    queryFn: () => hrApi.getEmployee(employeeId),
    enabled: Number.isFinite(employeeId),
  });

  useEffect(() => {
    if (!employee) return;
    let cancelled = false;

    fillContractTemplate(employee)
      .then((bytes) => {
        if (cancelled) return;
        const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPdfUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to generate contract preview.');
      });

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [employee]);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {employee ? bilingual(language, employee.fullNameEn, employee.fullNameAr) : t('contractRenewal')}
          </h1>
          <p className="text-xs text-muted-foreground">Contract preview — auto-filled from employee record, review before sending for signature</p>
        </div>
        {pdfUrl && (
          <a href={pdfUrl} download="contract-preview.pdf">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Download size={14} /> {t('download')}
            </Button>
          </a>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">{t('loading')}</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-destructive">{error}</div>
        )}
        {pdfUrl && !error && (
          <iframe src={pdfUrl} title="Contract preview" className="w-full h-full border-0" />
        )}
      </div>
    </div>
  );
}
