import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useExpenseStore, Member } from '@/stores/expenseStore';
import { Upload, FileText, CheckCircle, AlertTriangle, X } from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ImportDialogProps {
  children: React.ReactNode;
}

interface ImportRow {
  date: string;
  description: string;
  amount: string;
  paidBy: string;
  sharedWith: string;
  category: string;
  errors: string[];
}

interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  paidBy: string;
  sharedWith: string;
  category: string;
}

const categories = ['food', 'travel', 'entertainment', 'utilities', 'shopping', 'rent', 'healthcare', 'other'];

export const ImportDialog: React.FC<ImportDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '__skip__',
    description: '__skip__',
    amount: '__skip__',
    paidBy: '__skip__',
    sharedWith: '__skip__',
    category: '__skip__'
  });
  const [selectedGroup, setSelectedGroup] = useState('');
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [importSummary, setImportSummary] = useState<{ success: number; errors: number; } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addExpense, groups } = useExpenseStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setHeaders(Object.keys(results.data[0] || {}));
        setStep('mapping');
      },
      error: (error) => {
        toast({
          title: "Import Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive"
        });
      }
    });
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  const validateAndPreview = () => {
    if (!selectedGroup) {
      toast({
        title: "Group Required",
        description: "Please select a group for importing expenses.",
        variant: "destructive"
      });
      return;
    }

    const group = groups.find(g => g.id === selectedGroup);
    if (!group) return;

    const processedData: ImportRow[] = csvData.map((row, index) => {
      const errors: string[] = [];
      
      // Extract mapped values (skip fields that are set to '__skip__')
      const date = mapping.date !== '__skip__' ? row[mapping.date] || '' : '';
      const description = mapping.description !== '__skip__' ? row[mapping.description] || '' : '';
      const amount = mapping.amount !== '__skip__' ? row[mapping.amount] || '' : '';
      const paidBy = mapping.paidBy !== '__skip__' ? row[mapping.paidBy] || '' : '';
      const sharedWith = mapping.sharedWith !== '__skip__' ? row[mapping.sharedWith] || '' : '';
      const category = mapping.category !== '__skip__' ? row[mapping.category] || 'other' : 'other';

      // Validate required fields
      if (!date) errors.push('Missing date');
      if (!description) errors.push('Missing description');
      if (!amount || isNaN(parseFloat(amount))) errors.push('Invalid amount');
      if (!paidBy) errors.push('Missing paid by');

      // Validate date format
      if (date && isNaN(Date.parse(date))) {
        errors.push('Invalid date format');
      }

      // Validate people exist in group
      const paidByMember = group.members.find(m => 
        m.name.toLowerCase() === paidBy.toLowerCase() || 
        m.email.toLowerCase() === paidBy.toLowerCase()
      );
      if (paidBy && !paidByMember) {
        errors.push(`"${paidBy}" not found in group`);
      }

      return {
        date,
        description,
        amount,
        paidBy,
        sharedWith,
        category: categories.includes(category.toLowerCase()) ? category.toLowerCase() : 'other',
        errors
      };
    });

    setPreviewData(processedData);
    setStep('preview');
  };

  const performImport = () => {
    const group = groups.find(g => g.id === selectedGroup);
    if (!group || !user) return;

    let successCount = 0;
    let errorCount = 0;

    previewData.forEach(row => {
      if (row.errors.length > 0) {
        errorCount++;
        return;
      }

      try {
        // Find paid by member
        const paidByMember = group.members.find(m => 
          m.name.toLowerCase() === row.paidBy.toLowerCase() || 
          m.email.toLowerCase() === row.paidBy.toLowerCase()
        );

        if (!paidByMember) {
          errorCount++;
          return;
        }

        // Parse shared with (default to all group members if empty)
        let splitAmong: Member[] = group.members;
        if (row.sharedWith.trim()) {
          const sharedNames = row.sharedWith.split(/[,;]/).map(name => name.trim());
          splitAmong = sharedNames.map(name => {
            const member = group.members.find(m => 
              m.name.toLowerCase() === name.toLowerCase() || 
              m.email.toLowerCase() === name.toLowerCase()
            );
            return member;
          }).filter((member): member is Member => member !== undefined);
          
          // If no valid members found, use all group members
          if (splitAmong.length === 0) {
            splitAmong = group.members;
          }
        }

        addExpense({
          description: row.description,
          amount: parseFloat(row.amount),
          paidBy: paidByMember,
          splitAmong,
          groupId: selectedGroup,
          category: row.category,
          date: new Date(row.date),
          splitType: 'equal',
          splitData: {}
        }, user.uid);

        successCount++;
      } catch (error) {
        errorCount++;
      }
    });

    setImportSummary({ success: successCount, errors: errorCount });
    
    toast({
      title: "Import Complete",
      description: `${successCount} expenses imported successfully. ${errorCount} errors.`,
    });
  };

  const resetImport = () => {
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping({
      date: '__skip__',
      description: '__skip__',
      amount: '__skip__',
      paidBy: '__skip__',
      sharedWith: '__skip__',
      category: '__skip__'
    });
    setSelectedGroup('');
    setPreviewData([]);
    setStep('upload');
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(resetImport, 300); // Reset after dialog closes
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Import Expenses from CSV</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {step === 'upload' && (
            <>
              <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-8">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium mb-2">Upload CSV File</p>
                <p className="text-sm text-gray-600 mb-4">
                  Select a CSV file with your expense data
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-sm">Required Fields (Mandatory):</p>
                      <ul className="text-sm text-gray-600 ml-4 list-disc">
                        <li><strong>Date</strong> - Format: YYYY-MM-DD or MM/DD/YYYY</li>
                        <li><strong>Description</strong> - Expense description</li>
                        <li><strong>Amount</strong> - Numeric value (e.g., 25.50)</li>
                        <li><strong>Paid By</strong> - Name or email of person who paid</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Optional Fields:</p>
                      <ul className="text-sm text-gray-600 ml-4 list-disc">
                        <li><strong>Shared With</strong> - Semicolon-separated names/emails (e.g., "Jane;Bob")</li>
                        <li><strong>Category</strong> - One of: food, travel, entertainment, utilities, shopping, rent, healthcare, other</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-xs">
                      <p className="font-medium">Example CSV row:</p>
                      <code>2024-01-15, "Dinner at restaurant", 45.50, "john@email.com", "jane@email.com;bob@email.com", "food"</code>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </>
          )}

          {step === 'mapping' && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Import into Group</Label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(mapping).map(([field, value]) => (
                    <div key={field}>
                      <Label className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</Label>
                      <Select value={value} onValueChange={(val) => handleMappingChange(field as keyof ColumnMapping, val)}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select column for ${field}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__">-- Skip this field --</SelectItem>
                          {headers.map(header => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setStep('upload')}>
                    Back
                  </Button>
                  <Button onClick={validateAndPreview} disabled={!selectedGroup}>
                    Preview Import
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Import Preview</h3>
                  <div className="text-sm text-gray-600">
                    {previewData.filter(row => row.errors.length === 0).length} valid, {previewData.filter(row => row.errors.length > 0).length} errors
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid By</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {row.errors.length === 0 ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <X className="w-4 h-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.description}</TableCell>
                          <TableCell>${row.amount}</TableCell>
                          <TableCell>{row.paidBy}</TableCell>
                          <TableCell className="capitalize">{row.category}</TableCell>
                          <TableCell>
                            {row.errors.length > 0 && (
                              <span className="text-red-600 text-xs">
                                {row.errors.join(', ')}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setStep('mapping')}>
                    Back to Mapping
                  </Button>
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={performImport}
                    disabled={previewData.filter(row => row.errors.length === 0).length === 0}
                  >
                    Import {previewData.filter(row => row.errors.length === 0).length} Expenses
                  </Button>
                </div>
              </div>
            </>
          )}

          {importSummary && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Import completed! {importSummary.success} expenses added successfully.
                {importSummary.errors > 0 && ` ${importSummary.errors} rows had errors and were skipped.`}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
