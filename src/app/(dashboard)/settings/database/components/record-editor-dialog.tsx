'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import {
  type CreateDataRecordInput,
  type DataRecord,
  type UpdateDataRecordInput,
} from '../types';
import {
  datetimeLocalToIso,
  isoToDatetimeLocal,
  parseJsonObject,
  stringifyJson,
} from '../utils';

const schema = z.object({
  dataType: z.string().trim().min(1, 'Data type is required'),
  key: z.string().trim().min(1, 'Key is required'),
  participantId: z.string().optional(),
  contentJson: z.string().min(1, 'Content is required'),
  metadataJson: z.string().optional(),
  expiresAtLocal: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RecordEditorDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  record?: DataRecord | null;
  defaultDataType?: string | null;
  defaultParticipantId?: string | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateDataRecordInput) => Promise<void>;
  onUpdate: (input: UpdateDataRecordInput) => Promise<void>;
}

function buildDefaults(
  mode: 'create' | 'edit',
  record?: DataRecord | null,
  defaultDataType?: string | null,
  defaultParticipantId?: string | null
): FormValues {
  if (mode === 'edit' && record) {
    return {
      dataType: record.type ?? defaultDataType ?? '',
      key: record.key,
      participantId: record.participantId ?? '',
      contentJson: stringifyJson(record.content),
      metadataJson: stringifyJson(record.metadata, ''),
      expiresAtLocal: isoToDatetimeLocal(record.expiresAt),
    };
  }

  return {
    dataType: defaultDataType ?? '',
    key: '',
    participantId: defaultParticipantId ?? '',
    contentJson: '{\n  \n}',
    metadataJson: '',
    expiresAtLocal: '',
  };
}

function RecordEditorForm({
  mode,
  record,
  defaultDataType,
  defaultParticipantId,
  isSubmitting,
  onOpenChange,
  onCreate,
  onUpdate,
}: Omit<RecordEditorDialogProps, 'open'>) {
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(mode, record, defaultDataType, defaultParticipantId),
  });

  const onValid = async (values: FormValues) => {
    setFormError(null);
    try {
      const content = parseJsonObject(values.contentJson, 'Content');
      const metadataText = values.metadataJson?.trim();
      const metadata = metadataText ? parseJsonObject(metadataText, 'Metadata') : undefined;
      const expiresAt = datetimeLocalToIso(values.expiresAtLocal ?? '');
      const participantId = values.participantId?.trim() || undefined;

      if (isEdit) {
        await onUpdate({
          key: values.key.trim(),
          content,
          metadata: metadata ?? null,
          participantId: participantId ?? null,
          expiresAt,
        });
      } else {
        await onCreate({
          dataType: values.dataType.trim(),
          key: values.key.trim(),
          content,
          participantId,
          metadata,
          expiresAt,
        });
      }
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save the record.';
      setFormError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dataType">Data type</Label>
          <Input
            id="dataType"
            placeholder="e.g. preference"
            disabled={isEdit || isSubmitting}
            {...register('dataType')}
          />
          {errors.dataType && (
            <p className="text-xs text-destructive">{errors.dataType.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="key">Key</Label>
          <Input id="key" placeholder="unique key" disabled={isSubmitting} {...register('key')} />
          {errors.key && <p className="text-xs text-destructive">{errors.key.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="participantId">Participant ID</Label>
          <Input
            id="participantId"
            placeholder="optional"
            disabled={isSubmitting}
            {...register('participantId')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expiresAtLocal">Expires</Label>
          <Input
            id="expiresAtLocal"
            type="datetime-local"
            disabled={isSubmitting}
            {...register('expiresAtLocal')}
          />
        </div>
      </div>

      {isEdit && record && (
        <p className="text-xs text-muted-foreground">
          ID {record.id}
          {record.createdAt ? ` · Created ${new Date(record.createdAt).toLocaleString()}` : ''}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="contentJson">Content (JSON object)</Label>
        <Textarea
          id="contentJson"
          className="font-mono text-xs min-h-[180px]"
          spellCheck={false}
          disabled={isSubmitting}
          {...register('contentJson')}
        />
        {errors.contentJson && (
          <p className="text-xs text-destructive">{errors.contentJson.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="metadataJson">Metadata (optional JSON object)</Label>
        <Textarea
          id="metadataJson"
          className="font-mono text-xs min-h-[100px]"
          spellCheck={false}
          placeholder="{}"
          disabled={isSubmitting}
          {...register('metadataJson')}
        />
        {errors.metadataJson && (
          <p className="text-xs text-destructive">{errors.metadataJson.message}</p>
        )}
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create record'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RecordEditorDialog({
  open,
  mode,
  record,
  defaultDataType,
  defaultParticipantId,
  isSubmitting,
  onOpenChange,
  onCreate,
  onUpdate,
}: RecordEditorDialogProps) {
  // Include open/closed so the form remounts each time the dialog opens and
  // picks up current defaults (react-hook-form only applies defaultValues once).
  const formKey = `${mode}-${record?.id ?? 'new'}-${defaultDataType ?? ''}-${open ? 'open' : 'closed'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit record' : 'Add record'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update this document. Agent, tenant, and created time cannot be changed.'
              : 'Create a document for this agent activation. Type and key must be unique together.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RecordEditorForm
            key={formKey}
            mode={mode}
            record={record}
            defaultDataType={defaultDataType}
            defaultParticipantId={defaultParticipantId}
            isSubmitting={isSubmitting}
            onOpenChange={onOpenChange}
            onCreate={onCreate}
            onUpdate={onUpdate}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
