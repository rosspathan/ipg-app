import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FAQ {
  question: string;
  answer: string;
}

interface FAQManagerProps {
  faqs: FAQ[];
  onChange: (faqs: FAQ[]) => void;
}

export function FAQManager({ faqs, onChange }: FAQManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newFAQ, setNewFAQ] = useState<FAQ>({ question: '', answer: '' });

  const handleAdd = () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) return;
    
    onChange([...faqs, newFAQ]);
    setNewFAQ({ question: '', answer: '' });
    setIsAdding(false);
  };

  const handleEdit = (index: number, updatedFAQ: FAQ) => {
    const updated = [...faqs];
    updated[index] = updatedFAQ;
    onChange(updated);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    onChange(faqs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">FAQs</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      <div className="space-y-3">
        {/* Add new FAQ */}
        {isAdding && (
          <div className="p-4 bg-muted rounded-lg border space-y-3 animate-fade-in">
            <Input
              placeholder="Question"
              value={newFAQ.question}
              onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
            />
            <Textarea
              placeholder="Answer"
              value={newFAQ.answer}
              onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewFAQ({ question: '', answer: '' });
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newFAQ.question.trim() || !newFAQ.answer.trim()}
              >
                <Check className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Existing FAQs */}
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="p-4 bg-muted rounded-lg border"
          >
            {editingIndex === index ? (
              <div className="space-y-3">
                <Input
                  value={faq.question}
                  onChange={(e) => handleEdit(index, { ...faq, question: e.target.value })}
                />
                <Textarea
                  value={faq.answer}
                  onChange={(e) => handleEdit(index, { ...faq, answer: e.target.value })}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingIndex(null)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setEditingIndex(null)}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">{faq.question}</p>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingIndex(index)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {faqs.length === 0 && !isAdding && (
          <div className="p-4 bg-muted rounded-lg border text-center">
            <p className="text-sm text-muted-foreground">
              No FAQs added yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
