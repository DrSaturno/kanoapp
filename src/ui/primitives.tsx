'use client';
import { useEffect, useRef } from 'react';
import { X, Check, Clock, Minus, AlertCircle, Layers } from 'lucide-react';
import { statusLabels, type FinancialStatus } from '@/domain/finance';
export function Badge({ status }: { status: FinancialStatus }) {
  const Icon = {
    paid: Check,
    upcoming: Clock,
    partial: Layers,
    overdue: AlertCircle,
    inactive: Minus,
  }[status];
  return (
    <span className={`badge ${status}`}>
      <Icon size={13} />
      {statusLabels[status]}
    </span>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Layers size={26} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')}
    </span>
  );
}
export function Metric({
  label,
  value,
  caption,
  accent = false,
}: {
  label: string;
  value: string | number;
  caption: string;
  accent?: boolean;
}) {
  return (
    <div className={`metric ${accent ? 'accent' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <p>{caption}</p>
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-header">
        <div>
          <p className="eyebrow">KANO / GESTIÓN</p>
          <h2 id="dialog-title">{title}</h2>
        </div>
        <button className="icon-button" aria-label="Cerrar" disabled={busy} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function FormActions({
  pending,
  label = 'Guardar cambios',
}: {
  pending: boolean;
  label?: string;
}) {
  return (
    <div className="form-actions">
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? 'Guardando…' : label}
      </button>
    </div>
  );
}
export function FormError({ error }: { error: string }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
