import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgramModule } from "@/hooks/useProgramRegistry";

interface ContentTabProps {
  module: ProgramModule;
  onUpdate: (updates: Partial<ProgramModule>) => void;
}

interface FAQ {
  question: string;
  answer: string;
}

export function ContentTab({ module, onUpdate }: ContentTabProps) {
  const [description, setDescription] = useState(module.description || "");
  const [termsConditions, setTermsConditions] = useState(module.terms_conditions || "");
  const [faqs, setFaqs] = useState<FAQ[]>(module.faqs || []);
  const [tags, setTags] = useState<string[]>(module.tags || []);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    setDescription(module.description || "");
    setTermsConditions(module.terms_conditions || "");
    setFaqs(module.faqs || []);
    setTags(module.tags || []);
  }, [module]);

  const handleAddFAQ = () => {
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const handleUpdateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  const handleRemoveFAQ = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = () => {
    onUpdate({
      description,
      terms_conditions: termsConditions,
      faqs,
      tags
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="description">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="tags">Tags & SEO</TabsTrigger>
        </TabsList>

        {/* Description Tab */}
        <TabsContent value="description" className="space-y-4">
          <Card className="p-6">
            <Label htmlFor="description">Program Description</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Describe what this program does and why users should try it. Supports markdown.
            </p>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter program description..."
              rows={12}
              className="font-mono"
            />
          </Card>
        </TabsContent>

        {/* Terms & Conditions Tab */}
        <TabsContent value="terms" className="space-y-4">
          <Card className="p-6">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Legal terms users must agree to before using this program. Supports markdown.
            </p>
            <Textarea
              id="terms"
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder="Enter terms and conditions..."
              rows={12}
              className="font-mono"
            />
          </Card>
        </TabsContent>

        {/* FAQs Tab */}
        <TabsContent value="faqs" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label>Frequently Asked Questions</Label>
                <p className="text-sm text-muted-foreground">
                  Add common questions and answers about this program
                </p>
              </div>
              <Button onClick={handleAddFAQ} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add FAQ
              </Button>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="p-4 border-2">
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor={`question-${index}`}>Question {index + 1}</Label>
                        <Input
                          id={`question-${index}`}
                          value={faq.question}
                          onChange={(e) => handleUpdateFAQ(index, 'question', e.target.value)}
                          placeholder="What is this program about?"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`answer-${index}`}>Answer</Label>
                        <Textarea
                          id={`answer-${index}`}
                          value={faq.answer}
                          onChange={(e) => handleUpdateFAQ(index, 'answer', e.target.value)}
                          placeholder="This program allows you to..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFAQ(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}

              {faqs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No FAQs added yet</p>
                  <p className="text-sm">Click "Add FAQ" to create your first question</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tags & SEO Tab */}
        <TabsContent value="tags" className="space-y-4">
          <Card className="p-6">
            <Label>Program Tags</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Add tags to help users discover this program
            </p>
            <div className="flex gap-2 mb-4">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add a tag..."
              />
              <Button onClick={handleAddTag} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full"
                >
                  <span className="text-sm">{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {tags.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags added yet</p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          Save Content Changes
        </Button>
      </div>
    </div>
  );
}
