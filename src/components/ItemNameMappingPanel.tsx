import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Link2 } from 'lucide-react';
import { ItemNameResolver, type ManualMappingResult } from '../services/ItemNameResolver';

const isPositiveInteger = (value: string): boolean => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0;
};

type FeedbackState =
  | { type: 'success'; message: string; details?: string }
  | { type: 'error'; message: string };

export const ItemNameMappingPanel: React.FC = () => {
  const [itemIdInput, setItemIdInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [currentLinkedName, setCurrentLinkedName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isNameDirty, setIsNameDirty] = useState<boolean>(false);

  const parsedItemId = useMemo<number | null>(() => {
    if (!itemIdInput.trim()) {
      return null;
    }

    return isPositiveInteger(itemIdInput.trim()) ? Number(itemIdInput.trim()) : null;
  }, [itemIdInput]);

  const existingOwnerForName = useMemo<number | null>(() => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      return null;
    }

    const ownerId = ItemNameResolver.getIdForName(trimmed);
    return ownerId ?? null;
  }, [nameInput]);

  useEffect(() => {
    if (parsedItemId === null) {
      setCurrentLinkedName(null);
      if (!isNameDirty) {
        setNameInput('');
      }
      return;
    }

    const storedName = ItemNameResolver.getNameForId(parsedItemId);
    setCurrentLinkedName(storedName);
    if (!isNameDirty) {
      setNameInput(storedName ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedItemId]);

  useEffect(() => {
    const unsubscribe = ItemNameResolver.addListener(({ id, name }) => {
      if (parsedItemId !== null && id === parsedItemId) {
        setCurrentLinkedName(name);
        setNameInput(name);
        setIsNameDirty(false);
      }
    });

    return unsubscribe;
  }, [parsedItemId]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (parsedItemId === null) {
      setFeedback({ type: 'error', message: 'Введите корректный ID предмета (целое число > 0).' });
      return;
    }

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'Название предмета не может быть пустым.' });
      return;
    }

    const result: ManualMappingResult = ItemNameResolver.setManualMapping(parsedItemId, trimmedName);
    if (!result.success) {
      setFeedback({
        type: 'error',
        message: result.error ?? 'Не удалось сохранить сопоставление для указанного предмета.'
      });
      return;
    }

    const details: string[] = [];
    if (result.previousName && result.previousName !== trimmedName) {
      details.push(`Прошлое имя предмета: "${result.previousName}".`);
    }
    if (result.previousOwnerId && result.previousOwnerId !== parsedItemId) {
      const previousOwnerName =
        result.previousOwnerName && result.previousOwnerName !== trimmedName
          ? ` ("${result.previousOwnerName}")`
          : '';
      details.push(`Имя теперь отвязано от предмета #${result.previousOwnerId}${previousOwnerName}.`);
    }

    setFeedback({
      type: 'success',
      message: `Имя успешно закреплено за предметом #${parsedItemId}.`,
      details: details.length > 0 ? details.join(' ') : undefined
    });
    setCurrentLinkedName(trimmedName);
    setNameInput(trimmedName);
    setIsNameDirty(false);
  };

  const handleReset = () => {
    if (parsedItemId !== null) {
      const stored = ItemNameResolver.getNameForId(parsedItemId);
      setNameInput(stored ?? '');
      setCurrentLinkedName(stored ?? null);
    } else {
      setNameInput('');
      setCurrentLinkedName(null);
    }
    setIsNameDirty(false);
    setFeedback(null);
  };

  const showOverrideWarning =
    existingOwnerForName !== null &&
    parsedItemId !== null &&
    existingOwnerForName !== parsedItemId;

  return (
    <aside className="bg-[#111216]/85 backdrop-blur-sm border border-[#24252b] rounded-lg p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Link2 className="h-5 w-5 text-wow-blue" aria-hidden />
          Ручное сопоставление
        </h3>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Используйте это окно, чтобы задать точное имя предмета по его ID, если в данных не хватает
          соответствия. Изменение применится мгновенно и сохранится в локальном кеше.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="manual-item-id" className="block text-xs font-semibold text-gray-300 mb-1">
            ID предмета
          </label>
          <input
            id="manual-item-id"
            type="number"
            value={itemIdInput}
            onChange={(event) => {
              setItemIdInput(event.target.value);
              setIsNameDirty(false);
              setFeedback(null);
            }}
            placeholder="Например, 36906"
            className="w-full bg-[#1a1b21]/80 border border-[#2e3036] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-wow-blue focus:border-transparent"
          />
          {itemIdInput.trim() !== '' && parsedItemId === null && (
            <p className="text-xs text-red-400 mt-1">Укажите положительное целое число.</p>
          )}
        </div>

        <div>
          <label htmlFor="manual-item-name" className="block text-xs font-semibold text-gray-300 mb-1">
            Название предмета (точно как в игре)
          </label>
          <input
            id="manual-item-name"
            type="text"
            value={nameInput}
            onChange={(event) => {
              setNameInput(event.target.value);
              setIsNameDirty(true);
              setFeedback(null);
            }}
            placeholder="Например, Frost Lotus"
            className="w-full bg-[#1a1b21]/80 border border-[#2e3036] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-wow-blue focus:border-transparent"
            autoComplete="off"
          />
          {showOverrideWarning && (
            <p className="text-xs text-yellow-400 mt-1">
              Это имя сейчас связано с предметом #{existingOwnerForName}. Сохранение переназначит его.
            </p>
          )}
        </div>

        <div className="bg-[#14151c]/80 border border-[#2a2b31] rounded-lg px-3 py-2 text-xs text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Текущая запись:</span>
            <span className="text-white font-medium">
              {parsedItemId !== null ? `#${parsedItemId}` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Имя в кеше:</span>
            <span className="text-white font-medium">
              {currentLinkedName ?? 'не задано'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="flex-1 inline-flex justify-center items-center gap-2 bg-wow-blue/80 hover:bg-wow-blue text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={parsedItemId === null || !nameInput.trim()}
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-[#2e3036] text-gray-300 hover:text-white hover:bg-[#22232a]/80 transition-colors"
          >
            Сбросить
          </button>
        </div>
      </form>

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
            feedback.type === 'success'
              ? 'bg-[#10331f] border-[#1f8a3b] text-green-300'
              : 'bg-[#2a1313] border-red-600/70 text-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <div className="space-y-1">
            <p className="font-medium">{feedback.message}</p>
            {'details' in feedback && feedback.details && (
              <p className="text-[11px] leading-relaxed text-green-200/90">{feedback.details}</p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

