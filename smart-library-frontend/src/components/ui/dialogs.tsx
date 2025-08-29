import React, { useState } from 'react';
import Modal from '../Modal';

type ConfirmProps = {
  open: boolean;
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: 'default' | 'danger'; // controls confirm button color
};

export const ConfirmDialog: React.FC<ConfirmProps> = ({
  open,
  title = 'Please confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  tone = 'default',
}) => {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="text-gray-800">{message}</div>
      <div className="mt-6 flex justify-end space-x-3">
        <button className="px-4 py-2 rounded-lg border border-gray-300" onClick={onCancel}>
          {cancelText}
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-white ${
            tone === 'danger'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-700 hover:bg-blue-800'
          }`}
          onClick={onConfirm}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

type PromptProps = {
  open: boolean;
  title?: string;
  label: string;
  initialValue?: string;
  submitText?: string;
  cancelText?: string;
  validator?: (value: string) => string | null; // return error string or null
  onSubmit: (value: string) => void;
  onCancel: () => void;
  inputType?: 'text' | 'number';
  min?: number;
};

export const PromptDialog: React.FC<PromptProps> = ({
  open,
  title = 'Input',
  label,
  initialValue = '',
  submitText = 'Save',
  cancelText = 'Cancel',
  validator,
  onSubmit,
  onCancel,
  inputType = 'text',
  min,
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  // reset when opened
  React.useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
    }
  }, [open, initialValue]);

  const handleSubmit = () => {
    const err = validator ? validator(value) : null;
    if (err) { setError(err); return; }
    onSubmit(value);
  };

  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={inputType}
        value={value}
        min={min}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2"
      />
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <div className="mt-6 flex justify-end space-x-3">
        <button className="px-4 py-2 rounded-lg border border-gray-300" onClick={onCancel}>
          {cancelText}
        </button>
        <button className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800" onClick={handleSubmit}>
          {submitText}
        </button>
      </div>
    </Modal>
  );
};
