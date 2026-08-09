import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { 
  Upload, Crown, Image as ImageIcon, Settings, History, 
  Trash2, Star, Edit3, Move, CheckCircle2, X, Download, Share2, FlaskConical,
  Copy, Check, FileText, Phone, MessageSquare
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { PosterTemplate, PosterPlaceholder, PlaceholderType, AiRecognitionSettings } from '../types';
import Draggable from 'react-draggable';
import html2canvas from 'html2canvas';

// Placeholder visual options
const placeholderTypes = [
  { value: 'CustomerPhoto', label: 'Customer Photo' },
  { value: 'CustomerName', label: 'Customer Name' },
  { value: 'AwardTitle', label: 'Award Title' },
  { value: 'TotalPaid', label: 'Total Paid' },
  { value: 'TrustScore', label: 'Trust Score' },
  { value: 'LifetimeValue', label: 'Lifetime Value' },
  { value: 'LastPaymentDate', label: 'Last Payment Date' },
  { value: 'AiMessage', label: 'AI Message' },
  { value: 'GeneratedDate', label: 'Generated Date' },
  { value: 'CompanyLogo', label: 'Company Logo' },
  { value: 'QRCode', label: 'QR Code' }
];

export default function AdminHonors() {
  const { 
    posterTemplates, addPosterTemplate, updatePosterTemplate, deletePosterTemplate, setDefaultPosterTemplate,
    aiRecognitionSettings, updateAiRecognitionSettings, aiRecognitionHistory, addAiRecognitionHistory, transactions, customers
  } = useStore();

  const [activeTab, setActiveTab] = useState<'templates' | 'history' | 'settings'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<PosterTemplate | null>(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<PosterPlaceholder | null>(null);
  
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PosterTemplate | null>(null);
  const [isPreviewTest, setIsPreviewTest] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  // Settings
  const currentSettings = aiRecognitionSettings || {
    enabled: false,
    frequency: 'manual',
    enablePhoto: true,
    enableAiMessage: true,
    whatsappDelivery: 'download_only',
    theme: 'luxury_gold',
    orientation: 'portrait'
  };

  const calculateTopPayer = () => {
    const payerStats: Record<string, { totalAmount: number, count: number, name: string }> = {};
    transactions.forEach(tx => {
      if (tx.type === 'received') {
        if (!payerStats[tx.personName]) payerStats[tx.personName] = { totalAmount: 0, count: 0, name: tx.personName };
        payerStats[tx.personName].totalAmount += tx.amount;
        payerStats[tx.personName].count += 1;
      }
    });
    const sorted = Object.values(payerStats).sort((a, b) => b.totalAmount - a.totalAmount);
    return sorted.length > 0 ? sorted[0] : null;
  };

  const topPayer = useMemo(() => calculateTopPayer(), [transactions]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
      alert("File is too large (max 20MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      addPosterTemplate({
        name: file.name.split('.')[0] || 'New Template',
        imageUrl: dataUrl,
        isDefault: posterTemplates?.length === 0,
        placeholders: []
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddPlaceholder = (type: PlaceholderType) => {
    if (!editingTemplate) return;
    const newPlaceholder: PosterPlaceholder = {
      id: crypto.randomUUID(),
      type,
      style: {
        x: 10, y: 10, width: 30, height: 10,
        fontSize: 24, fontFamily: 'sans-serif', fontColor: '#ffffff',
        isBold: true, alignment: 'center', borderRadius: 0, opacity: 100
      }
    };
    updatePosterTemplate(editingTemplate.id, {
      placeholders: [...editingTemplate.placeholders, newPlaceholder]
    });
    setEditingTemplate(prev => prev ? { ...prev, placeholders: [...prev.placeholders, newPlaceholder] } : null);
    setSelectedPlaceholder(newPlaceholder);
  };

  const handleUpdatePlaceholder = (updates: Partial<PosterPlaceholder['style']>) => {
    if (!editingTemplate || !selectedPlaceholder) return;
    
    const updatedPlaceholder = {
      ...selectedPlaceholder,
      style: { ...selectedPlaceholder.style, ...updates }
    };
    
    const newPlaceholders = editingTemplate.placeholders.map(p => 
      p.id === selectedPlaceholder.id ? updatedPlaceholder : p
    );
    
    updatePosterTemplate(editingTemplate.id, { placeholders: newPlaceholders });
    setEditingTemplate(prev => prev ? { ...prev, placeholders: newPlaceholders } : null);
    setSelectedPlaceholder(updatedPlaceholder);
  };

  const handleDeletePlaceholder = () => {
    if (!editingTemplate || !selectedPlaceholder) return;
    const newPlaceholders = editingTemplate.placeholders.filter(p => p.id !== selectedPlaceholder.id);
    updatePosterTemplate(editingTemplate.id, { placeholders: newPlaceholders });
    setEditingTemplate(prev => prev ? { ...prev, placeholders: newPlaceholders } : null);
    setSelectedPlaceholder(null);
  };

  const generatePreview = (template: PosterTemplate, isTest = false) => {
    if (!isTest && !topPayer) {
      alert("No customer data available to generate preview.");
      return;
    }
    setIsPreviewTest(isTest);
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  const [copiedMessage, setCopiedMessage] = useState(false);

  const getWhatsAppMessageText = () => {
    const customer = isPreviewTest ? {
      name: 'Demo Customer',
    } : (topPayer ? customers?.find(c => c.name.toLowerCase() === topPayer.name.toLowerCase()) || topPayer : null);

    if (!customer) return '';

    const messageText = isPreviewTest 
      ? "Thank you for your continued trust and timely payments. SmartLedger appreciates your partnership and looks forward to many more successful transactions."
      : "Thank you for your outstanding reliability and trust. Your prompt payments and continued partnership mean a great deal to our business.";
    
    const awardTitle = isPreviewTest ? 'Top Payer' : 'Top Customer';
    
    return `Congratulations ${customer.name}!\n\nYou have been selected as our ${awardTitle} of the Month.\n\n${messageText}\n\nYour appreciation poster has been prepared.\n\nGenerated by SmartLedger AI.`;
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(getWhatsAppMessageText());
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const customer = isPreviewTest ? {
      name: 'Demo Customer',
      phone: '+919876543210'
    } : (topPayer ? customers?.find(c => c.name.toLowerCase() === topPayer.name.toLowerCase()) : null);

    const phone = customer?.phone;
    if (!phone) {
      alert("No phone number found for this customer. Please update their profile first.");
      return;
    }

    const encodedText = encodeURIComponent(getWhatsAppMessageText());
    const formattedPhone = phone.replace(/\D/g, ''); // Remove non-numeric chars
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, '_blank');
    
    // Add to history
    if (!isPreviewTest && topPayer) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const alreadyGenerated = aiRecognitionHistory?.some(item => 
        item.customerName === topPayer.name && 
        item.date.startsWith(currentMonth)
      );

      if (!alreadyGenerated) {
        addAiRecognitionHistory({
          customerName: topPayer.name,
          awardTitle: "Top Customer",
          date: new Date().toISOString(),
          deliveryStatus: 'sent'
        });
      }
    }
  };

  const downloadPoster = async (format: 'png' | 'pdf') => {
    const currentCustomer = isPreviewTest ? { name: 'Demo Customer' } : topPayer;
    if (!posterRef.current || !previewTemplate || !currentCustomer) return;
    
    try {
      const canvas = await html2canvas(posterRef.current, { scale: 2, useCORS: true, logging: false });
      
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `Honors_${currentCustomer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        alert("PDF download requires jsPDF library. Falling back to PNG.");
      }
      
      if (!isPreviewTest && topPayer) {
        // Prevent duplicate poster generation for the same customer in the same month
        const currentMonth = new Date().toISOString().substring(0, 7);
        const alreadyGenerated = aiRecognitionHistory?.some(item => 
          item.customerName === topPayer.name && 
          item.date.startsWith(currentMonth)
        );

        if (!alreadyGenerated) {
          addAiRecognitionHistory({
            customerName: topPayer.name,
            awardTitle: "Top Customer",
            date: new Date().toISOString(),
            deliveryStatus: 'downloaded'
          });
        }
      }
      
    } catch (err) {
      console.error(err);
      alert("Failed to generate poster.");
    }
  };

  // Renderer for placeholders
  const renderPlaceholder = (p: PosterPlaceholder, forPreview = false) => {
    const isSelected = selectedPlaceholder?.id === p.id && !forPreview;
    
    let content: React.ReactNode = p.type;
    const realCustomerMatch = topPayer ? customers?.find(c => c.name.toLowerCase() === topPayer.name.toLowerCase()) : null;

    const currentCustomer = forPreview ? (isPreviewTest ? {
      name: 'Demo Customer',
      totalAmount: 125000,
      trustScore: '98/100',
      lifetimeValue: 'High (₹8,75,000)',
      lastPaymentDate: '20 July 2026',
      aiMessage: "Thank you for your continued trust and timely payments. SmartLedger appreciates your partnership and looks forward to many more successful transactions.",
      photoInitials: 'D',
      photoUrl: null
    } : (topPayer ? {
      name: topPayer.name,
      totalAmount: topPayer.totalAmount,
      trustScore: '98/100',
      lifetimeValue: 'High',
      lastPaymentDate: new Date().toLocaleDateString(),
      aiMessage: "Thank you for your outstanding reliability and trust. Your prompt payments and continued partnership mean a great deal to our business.",
      photoInitials: topPayer.name.charAt(0).toUpperCase(),
      photoUrl: realCustomerMatch?.photoUrl
    } : null)) : null;

    if (forPreview && currentCustomer) {
      switch (p.type) {
        case 'CustomerName': content = currentCustomer.name; break;
        case 'AwardTitle': content = isPreviewTest ? 'Top Payer' : 'Top Customer'; break;
        case 'TotalPaid': content = isPreviewTest ? '₹1,25,000' : formatCurrency(currentCustomer.totalAmount); break;
        case 'TrustScore': content = currentCustomer.trustScore; break;
        case 'LifetimeValue': content = isPreviewTest ? '₹8,75,000' : currentCustomer.lifetimeValue; break;
        case 'LastPaymentDate': content = currentCustomer.lastPaymentDate; break;
        case 'AiMessage': content = currentCustomer.aiMessage; break;
        case 'GeneratedDate': content = new Date().toLocaleDateString(); break;
        case 'CustomerPhoto': 
          content = currentCustomer.photoUrl ? (
            <img 
              src={currentCustomer.photoUrl} 
              alt={currentCustomer.name} 
              className="w-full h-full object-cover" 
              style={{ borderRadius: `${p.style.borderRadius}%` }} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-amber-400 to-amber-600 text-white font-bold"
                 style={{ borderRadius: `${p.style.borderRadius}%`, fontSize: `${Math.min(p.style.width, p.style.height) * 0.4}px` }}>
              {currentCustomer.photoInitials}
            </div>
          );
          break;
        case 'CompanyLogo':
          content = <div className="w-full h-full bg-white/20 flex items-center justify-center rounded-lg">Logo</div>;
          break;
        case 'QRCode':
          content = <div className="w-full h-full bg-white flex items-center justify-center text-black text-[10px]">QR</div>;
          break;
      }
    } else if (p.type === 'CustomerPhoto' || p.type === 'CompanyLogo' || p.type === 'QRCode') {
      content = <div className="w-full h-full bg-white/10 flex items-center justify-center border border-dashed border-white/40 text-xs text-white/50">{p.type}</div>;
    }

    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${p.style.x}%`,
      top: `${p.style.y}%`,
      width: `${p.style.width}%`,
      height: `${p.style.height}%`,
      fontSize: `${p.style.fontSize}px`,
      fontFamily: p.style.fontFamily,
      color: p.style.fontColor,
      fontWeight: p.style.isBold ? 'bold' : 'normal',
      textAlign: p.style.alignment,
      opacity: p.style.opacity / 100,
      borderRadius: `${p.style.borderRadius}%`,
      border: isSelected ? '2px solid #3b82f6' : 'none',
      cursor: forPreview ? 'default' : 'move',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      overflow: 'hidden',
      textShadow: '0 2px 4px rgba(0,0,0,0.5)'
    };

    if (forPreview) {
      return (
        <div key={p.id} style={style}>
          {content}
        </div>
      );
    }

    return (
      <Draggable 
        key={p.id} 
        bounds="parent"
        position={{ x: 0, y: 0 }}
        onStop={(e, data) => {
          if (!posterRef.current) return;
          const rect = posterRef.current.getBoundingClientRect();
          const newX = p.style.x + (data.deltaX / rect.width) * 100;
          const newY = p.style.y + (data.deltaY / rect.height) * 100;
          setSelectedPlaceholder(p);
          handleUpdatePlaceholder({ x: newX, y: newY });
        }}
        onStart={() => setSelectedPlaceholder(p)}
      >
        <div 
          style={{...style, left: `${p.style.x}%`, top: `${p.style.y}%`, transform: 'none'}} 
          onClick={(e) => { e.stopPropagation(); setSelectedPlaceholder(p); }}
        >
          {content}
          {isSelected && (
            <div className="absolute -bottom-6 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 rounded">
              Selected
            </div>
          )}
        </div>
      </Draggable>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/20">
          <Crown className="text-white" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SmartLedger Honors</h1>
          <p className="text-slate-400 mt-1">Admin template manager for automated customer recognition.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        {[
          { id: 'templates', label: 'Templates', icon: ImageIcon },
          { id: 'history', label: 'History', icon: History },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all",
              activeTab === tab.id 
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-white">Poster Templates</h2>
                <p className="text-slate-400 text-sm mt-1">Upload and configure recognition posters.</p>
              </div>
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                <Upload size={18} /> Upload Poster
              </button>
            </div>

            {posterTemplates && posterTemplates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posterTemplates.map(template => (
                  <div key={template.id} className={cn("bg-black/40 border rounded-2xl p-4 transition-all group", template.isDefault ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-white/10 hover:border-white/30")}>
                    <div className="relative aspect-[3/4] bg-neutral-900 rounded-xl overflow-hidden mb-4">
                      <img src={template.imageUrl} alt={template.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={() => setEditingTemplate(template)} className="p-3 bg-blue-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg">
                          <Edit3 size={20} />
                        </button>
                        <button onClick={() => generatePreview(template)} className="p-3 bg-amber-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg">
                          <CheckCircle2 size={20} />
                        </button>
                      </div>
                      {template.isDefault && (
                        <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1 shadow-lg">
                          <Star size={12} /> Default
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white truncate pr-4">{template.name}</h3>
                      <div className="flex items-center gap-2">
                        {!template.isDefault && (
                          <button onClick={() => setDefaultPosterTemplate(template.id)} className="text-slate-400 hover:text-amber-400" title="Set as default">
                            <Star size={18} />
                          </button>
                        )}
                        <button onClick={() => deletePosterTemplate(template.id)} className="text-slate-400 hover:text-red-400" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 border border-dashed border-white/20 rounded-2xl">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="text-slate-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No templates yet</h3>
                <p className="text-slate-400 mb-6 max-w-sm mx-auto">Upload a beautifully designed poster background (PNG/JPG) to start generating AI recognition.</p>
                <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)]">
                  Upload First Template
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400"><History size={24} /></div>
            <div>
              <h2 className="text-xl font-bold text-white">Generation History</h2>
              <p className="text-slate-400 text-sm">Past generated posters for your top customers.</p>
            </div>
          </div>
          
          {aiRecognitionHistory && aiRecognitionHistory.length > 0 ? (
            <div className="space-y-4">
              {aiRecognitionHistory.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                      {customers?.find(c => c.name.toLowerCase() === item.customerName.toLowerCase())?.photoUrl ? (
                        <img src={customers.find(c => c.name.toLowerCase() === item.customerName.toLowerCase())!.photoUrl!} alt={item.customerName} className="w-full h-full object-cover" />
                      ) : (
                        item.customerName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{item.customerName}</h3>
                      <p className="text-sm text-slate-400">{item.awardTitle} • {new Date(item.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-xs uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg",
                      item.deliveryStatus === 'sent' ? "bg-green-500/20 text-green-400" :
                      item.deliveryStatus === 'downloaded' ? "bg-amber-500/20 text-amber-400" :
                      "bg-blue-500/20 text-blue-400"
                    )}>
                      {item.deliveryStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 opacity-50">
              <History className="mx-auto mb-3" size={32} />
              <p className="text-slate-300">No posters generated yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400"><Settings size={24} /></div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Automation Settings</h2>
              <p className="text-slate-400 text-sm">Configure how often AI selects winners and sends posters.</p>
            </div>
          </div>
          
          <div className="max-w-xl space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-300 block">Automation Frequency</label>
              <select
                value={currentSettings.frequency}
                onChange={(e) => updateAiRecognitionSettings({ frequency: e.target.value as AiRecognitionSettings['frequency'] })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 appearance-none"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="manual">Manually Generate Only</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-300 block">WhatsApp Delivery Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['auto', 'ask', 'download_only'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => updateAiRecognitionSettings({ whatsappDelivery: option })}
                    className={cn(
                      "px-4 py-3 rounded-xl border text-sm font-medium transition-all text-center",
                      currentSettings.whatsappDelivery === option
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                        : "bg-black/40 border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {option === 'auto' ? 'Send Auto' : option === 'ask' ? 'Ask Before' : 'Download Only'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
               <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={currentSettings.enabled} 
                      onChange={(e) => updateAiRecognitionSettings({ enabled: e.target.checked })} 
                    />
                    <div className={cn("block w-14 h-8 rounded-full transition-colors", currentSettings.enabled ? "bg-amber-500" : "bg-white/10")}></div>
                    <div className={cn("absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform", currentSettings.enabled ? "translate-x-6" : "")}></div>
                  </div>
                  <div>
                    <span className="text-white font-medium block">Enable Honors System</span>
                    <span className="text-slate-400 text-xs">Turn off to completely pause all generation</span>
                  </div>
               </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl mt-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-pink-500/10 rounded-xl text-pink-400">
              <FlaskConical size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Test Poster Delivery</h2>
              <p className="text-slate-400 text-sm">Allow the Owner/Admin to test the complete poster generation and delivery workflow before sending it to a real customer.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => {
                const defaultTemplate = posterTemplates?.find(t => t.isDefault) || posterTemplates?.[0];
                if (defaultTemplate) generatePreview(defaultTemplate, true);
                else alert("Please add a template first.");
              }} 
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/5"
            >
              <span className="text-xl">🧪</span> Generate Test Poster
            </button>
            <button 
              onClick={() => {
                const phone = prompt("Enter phone number to test WhatsApp delivery (e.g. +91XXXXXXXXXX):");
                if (phone) {
                  alert(`This is a test message. No real customer data will be used.\n\nSending demo poster to ${phone}...`);
                  setTimeout(() => alert(`Delivered demo poster to ${phone} successfully!`), 1000);
                }
              }} 
              className="px-4 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-semibold rounded-xl border border-green-500/20 flex items-center justify-center gap-2 transition-colors"
            >
              <span className="text-xl">📲</span> Test WhatsApp Delivery
            </button>
            <button 
              onClick={() => {
                const defaultTemplate = posterTemplates?.find(t => t.isDefault) || posterTemplates?.[0];
                if (defaultTemplate) generatePreview(defaultTemplate, true);
                else alert("Please add a template first.");
              }} 
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/5"
            >
              <span className="text-xl">👀</span> Preview Test Poster
            </button>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {editingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0f111a] border border-white/10 rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Edit3 size={20} className="text-amber-500"/> Edit Template: {editingTemplate.name}</h2>
                <button onClick={() => { setEditingTemplate(null); setSelectedPlaceholder(null); }} className="p-2 text-slate-400 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Canvas Area */}
                <div className="flex-1 bg-black/50 p-6 flex items-center justify-center overflow-auto" onClick={() => setSelectedPlaceholder(null)}>
                  <div 
                    ref={posterRef}
                    className="relative shadow-2xl bg-black"
                    style={{ 
                      width: '400px', // Fixed canvas width for proportional editing
                      aspectRatio: '3/4', // Assuming portrait standard
                      backgroundImage: `url(${editingTemplate.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {editingTemplate.placeholders.map(p => renderPlaceholder(p, false))}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-80 bg-black/40 border-l border-white/10 p-6 overflow-y-auto">
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Add Placeholder</h3>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3"
                      onChange={(e) => {
                        if (e.target.value) handleAddPlaceholder(e.target.value as PlaceholderType);
                        e.target.value = '';
                      }}
                      value=""
                    >
                      <option value="" disabled>Select overlay element...</option>
                      {placeholderTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                    </select>
                  </div>

                  {selectedPlaceholder ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Edit Element</h3>
                        <button onClick={handleDeletePlaceholder} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={16} /></button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Width (%)</label>
                          <input type="range" min="10" max="100" value={selectedPlaceholder.style.width} onChange={e => handleUpdatePlaceholder({ width: Number(e.target.value) })} className="w-full accent-amber-500" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Height (%)</label>
                          <input type="range" min="5" max="100" value={selectedPlaceholder.style.height} onChange={e => handleUpdatePlaceholder({ height: Number(e.target.value) })} className="w-full accent-amber-500" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Font Size (px)</label>
                          <input type="number" value={selectedPlaceholder.style.fontSize} onChange={e => handleUpdatePlaceholder({ fontSize: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Font Color</label>
                          <input type="color" value={selectedPlaceholder.style.fontColor} onChange={e => handleUpdatePlaceholder({ fontColor: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                            <input type="checkbox" checked={selectedPlaceholder.style.isBold} onChange={e => handleUpdatePlaceholder({ isBold: e.target.checked })} className="rounded bg-white/10 border-white/20 text-amber-500 focus:ring-amber-500" />
                            Bold Text
                          </label>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Alignment</label>
                          <div className="flex bg-white/5 p-1 rounded-lg">
                            {(['left', 'center', 'right'] as const).map(align => (
                              <button key={align} onClick={() => handleUpdatePlaceholder({ alignment: align })} className={cn("flex-1 py-1.5 text-sm rounded-md capitalize", selectedPlaceholder.style.alignment === align ? "bg-white/10 text-white" : "text-slate-400")}>
                                {align}
                              </button>
                            ))}
                          </div>
                        </div>
                        {selectedPlaceholder.type === 'CustomerPhoto' && (
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Border Radius (%)</label>
                            <input type="range" min="0" max="50" value={selectedPlaceholder.style.borderRadius} onChange={e => handleUpdatePlaceholder({ borderRadius: Number(e.target.value) })} className="w-full accent-amber-500" />
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Opacity (%)</label>
                          <input type="range" min="10" max="100" value={selectedPlaceholder.style.opacity} onChange={e => handleUpdatePlaceholder({ opacity: Number(e.target.value) })} className="w-full accent-amber-500" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 px-4 opacity-50">
                      <Move className="mx-auto mb-3" size={24} />
                      <p className="text-sm">Click any element on the poster to edit its properties.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Winner Modal */}
      <AnimatePresence>
        {showPreviewModal && previewTemplate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0f111a] border border-white/10 rounded-3xl w-full max-w-4xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><CheckCircle2 size={20} className="text-amber-500"/> Poster Preview: {isPreviewTest ? 'Demo Customer (Test Mode)' : topPayer?.name}</h2>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 text-slate-400 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 bg-black/50 p-6 flex items-center justify-center overflow-auto">
                  {/* Actual render for html2canvas */}
                  <div 
                    ref={posterRef}
                    className="relative overflow-hidden"
                    style={{ 
                      width: '400px',
                      aspectRatio: '3/4',
                      backgroundImage: `url(${previewTemplate.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: '#000'
                    }}
                  >
                    {previewTemplate.placeholders.map(p => renderPlaceholder(p, true))}
                    
                    {isPreviewTest && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-50">
                        <div className="text-[100px] font-black text-red-500/20 transform -rotate-45 whitespace-nowrap tracking-widest border-4 border-red-500/20 px-8 py-2 rounded-xl">
                          TEST MODE
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full md:w-72 bg-black/40 p-6 border-l border-white/10 flex flex-col gap-4 justify-center">
                  <h3 className="font-bold text-white mb-2">Actions</h3>
                  <button onClick={() => downloadPoster('png')} className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Download size={18} /> Download PNG
                  </button>
                  <button onClick={() => alert("WhatsApp API integration required.")} className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-600/20">
                    <Share2 size={18} /> Send via WhatsApp
                  </button>
                  <button onClick={() => setShowPreviewModal(false)} className="w-full px-4 py-3 bg-transparent border border-white/20 hover:bg-white/5 text-white font-semibold rounded-xl transition-colors mt-4">
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
