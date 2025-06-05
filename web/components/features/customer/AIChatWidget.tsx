"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { SendHorizonal, X } from "lucide-react";

interface AIChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantPrimaryColor: string; // To style the widget elements
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
}

export default function AIChatWidget({
  isOpen,
  onClose,
  restaurantPrimaryColor,
}: AIChatWidgetProps) {
  const t = useTranslations("AIChatWidget");
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]); // Placeholder for chat history

  const handleSendMessage = () => {
    if (message.trim() === "") return;

    console.log("Sending message to /api/v2/chatbot:", message);
    // Add user message to chat
    setChatMessages(prev => [...prev, { id: Date.now().toString(), text: message, sender: "user" }]);

    // Simulate API call and AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, {id: (Date.now()+1).toString(), text: "This is a mock AI response for: '" + message + "'. Feature coming soon!", sender: "ai"}]);
    }, 500);

    setMessage(""); // Clear input
  };

  const getTextColor = (bgColor: string): string => {
    const color = bgColor.startsWith("#") ? bgColor.substring(1, 7) : bgColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#ffffff";
  };
  const buttonTextColor = getTextColor(restaurantPrimaryColor);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0">
        <DialogHeader className="p-6 pb-4" style={{backgroundColor: restaurantPrimaryColor, color: buttonTextColor}}>
          <DialogTitle className="flex justify-between items-center">
            {t("title")}
            <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full" style={{color: buttonTextColor}}>
                    <X className="h-5 w-5" />
                </Button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 max-h-[400px] h-[400px] overflow-y-auto space-y-4">
          {/* Mock display area for messages */}
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] p-3 rounded-lg text-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white' // User message
                    : 'bg-gray-200 text-gray-800' // AI message
                }`}
                style={msg.sender === 'user' ? {backgroundColor: restaurantPrimaryColor, color: buttonTextColor} : {}}
              >
                {msg.text}
              </div>
            </div>
          ))}
           {chatMessages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground pt-16">{t('noMessagesYet')}</div>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
          <div className="flex items-center w-full space-x-2">
            <Input
              type="text"
              placeholder={t("inputPlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button
                type="button"
                onClick={handleSendMessage}
                style={{backgroundColor: restaurantPrimaryColor, color: buttonTextColor}}
                size="icon"
            >
              <SendHorizonal className="h-5 w-5" />
              <span className="sr-only">{t("sendButton")}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
