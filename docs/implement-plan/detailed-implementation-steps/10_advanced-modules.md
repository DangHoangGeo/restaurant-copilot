### 10. Advanced Modules (Feature-Flagged)

10.1. **Payments Integration (Stripe & PayPay)**
10.1.1. **Edge Function: create PaymentIntent**
\- Create `/infra/edge/payments/create-intent.js` (Node/TypeScript):
\`\`\`ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

````
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2022-11-15" });

   export async function POST(req: NextRequest) {
     const { orderId, amount, currency = "jpy" } = await req.json();
     if (!orderId || !amount) {
       return NextResponse.json({ error: "Missing fields" }, { status: 400 });
     }
     try {
       const paymentIntent = await stripe.paymentIntents.create({
         amount: Math.round(amount * 100),
         currency,
         metadata: { orderId },
       });
       return NextResponse.json({ clientSecret: paymentIntent.client_secret });
     } catch (err) {
       return NextResponse.json({ error: (err as any).message }, { status: 500 });
     }
   }
   ```  
   (Req 8.1)  
 - Create a Next.js API route `/web/app/api/v2/payments/create-intent.ts` that proxies to the Edge Function if needed.  
````

10.1.2. **Web Checkout Flow (FEATURE\_FLAGS.payments)**
\- In `/web/app/[locale]/customer/checkout/page.tsx`:
\- On mount, POST to `/api/v2/payments/create-intent` with `{ orderId, amount: totalAmount }`; get `clientSecret`.
\- Render `<Elements stripe={loadStripe(NEXT_PUBLIC_STRIPE_KEY)} options={{ clientSecret }}>` and a `<CheckoutForm>` containing `<CardElement>`.
\- On submit, call `stripe.confirmCardPayment(clientSecret)`. On success, POST `/api/v1/orders/update` (or direct Supabase call) to set `status = "completed"`, then call a separate API or rely on Realtime to let iOS know. Redirect to “Thank You.”
(Req 8.1)
10.1.3. **iOS PaymentSheet Integration (FEATURE\_FLAGS.enablePayments)**
\- In `CheckoutView.swift`, if `FeatureFlags.enablePayments` is `true`:
1\. Fetch `clientSecret` via a POST to `https://{restaurantSubdomain}.shop-copilot.com/api/v2/payments/create-intent` with `orderId` and `amount`.
2\. Create and configure a `PaymentSheet` object with `PaymentSheet.Configuration()`.
3\. Present `paymentSheet.present(from: viewController)`; handle `.completed`, `.failed`, `.canceled`.
4\. On `.completed`, call `OrderService.updateOrderStatus(orderId, "completed")` and `PrinterManager.printReceipt(order)`.
(Req 8.1)

* Wrap all payment UI behind `if FEATURE_FLAGS.payments`. Verify that if `payments=false`, the checkout page only shows “Cash only” messaging.
  ‣ (Req 8.1)

10.2. **AI Assistant (Chatbot)**
10.2.1. **Edge Function: /api/v2/chatbot**
\- Create `/web/app/api/v2/chatbot.ts`:
\`\`\`ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

````
   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

   export async function POST(req: NextRequest) {
     const { restaurantId, language, userQuery } = await req.json();
     if (!restaurantId || !language || !userQuery) {
       return NextResponse.json({ error: "Missing fields" }, { status: 400 });
     }
     const { data: menuItems } = await supabaseAdmin
       .from("menu_items")
       .select(`name_${language}, description_${language}, price`)
       .eq("restaurant_id", restaurantId)
       .eq("available", true);
     let prompt = `You are a virtual assistant for a restaurant. The menu items are:\n`;
     menuItems.forEach((item) => {
       prompt += `• ${item[`name_${language}`]}: ${item[`description_${language}`]} (¥${item.price})\n`;
     });
     prompt += `\nCustomer asks (in ${language}): ${userQuery}\nAnswer concisely in ${language}.`;
     try {
       const response = await openai.chat.completions.create({
         model: "gpt-4o",
         messages: [{ role: "user", content: prompt }],
       });
       const text = response.choices[0].message.content;
       await supabaseAdmin.from("chat_logs").insert({
         restaurant_id: restaurantId,
         user_language: language,
         prompt_text: userQuery,
         prompt_token_count: response.usage.prompt_tokens,
         response_token_count: response.usage.completion_tokens,
       });
       return NextResponse.json({ response: text });
     } catch (err) {
       return NextResponse.json({ error: (err as any).message }, { status: 500 });
     }
   }
   ```  
   (Req 8.2)  
````

10.2.2. **Web Chat Widget**
\- In `/web/components/ChatWidget.tsx`:
\`\`\`tsx
import { useState } from "react";
import { useTranslations } from "next-intl";

````
   export default function ChatWidget({ restaurantId, locale }) {
     const t = useTranslations("CHAT");
     const [open, setOpen] = useState(false);
     const [input, setInput] = useState("");
     const [messages, setMessages] = useState([]);

     async function sendMessage() {
       const msg = { role: "user", content: input };
       setMessages([...messages, msg]);
       setInput("");

       const response = await fetch(`/api/v2/chatbot`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ restaurantId, language: locale, userQuery: input }),
       });
       const data = await response.json();
       if (data.response) {
         setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
       }
     }

     return (
       <div className="chat-widget fixed bottom-4 right-4">
         {open ? (
           <div className="w-80 h-96 bg-white border rounded shadow flex flex-col">
             <div className="flex justify-between p-2 border-b">
               <h4>{t("CHAT_NOW")}</h4>
               <button onClick={() => setOpen(false)}>×</button>
             </div>
             <div className="flex-1 p-2 overflow-auto">
               {messages.map((msg, idx) => (
                 <div key={idx} className={msg.role === "user" ? "text-right" : "text-left"}>
                   <p className={msg.role === "user" ? "bg-blue-100 inline-block p-2 rounded" : "bg-gray-100 inline-block p-2 rounded"}>
                     {msg.content}
                   </p>
                 </div>
               ))}
             </div>
             <div className="p-2 border-t">
               <input
                 type="text"
                 className="w-full border p-1 rounded"
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 placeholder={t("ASK_A_QUESTION")}
               />
               <button onClick={sendMessage} className="btn-secondary mt-1">
                 {t("SEND")}
               </button>
             </div>
           </div>
         ) : (
           <button onClick={() => setOpen(true)} className="btn-primary p-3 rounded-full">
             {t("CHAT")}
           </button>
         )}
       </div>
     );
   }
   ```  
   (Req 8.2)  
````

* Wrap `<ChatWidget>` in the root customer layout, but only render if `FEATURE_FLAGS.aiAssistant` is `true`.
* Test by typing a question like “おすすめは何ですか？” (“What do you recommend?”) and confirm the AI responds in Japanese with menu items.
  ‣ (Req 8.2)

10.3. **Audit Logging & Monitoring Alerts**

* Audit triggers already created in step 2.6.
* In Supabase’s dashboard, schedule an external monitoring alert (via webhook or Slack) when:

  * There are > 100 failed login attempts in the last hour (query `auth.signin_logs` table).
  * There are > 10 000 `orders` inserts in the last hour (possible DoS).
  * There is a > 5% spike in 500 errors across Vercel logs in a 10-minute window.
    (Req 8.3)
* Test by simulating failed logins (e.g., invalid credentials) and observe if the alert triggers.
  ‣ (Req 8.3)

10.4. **API Versioning & Deprecation**

* Confirm that all stable endpoints remain under `/api/v1`. For any new/breaking changes (Payments, Chatbot), place in `/api/v2`.
* In the README and API documentation, note that v1 endpoints will remain supported for 3 months after a v2 equivalent exists, then be deprecated.
* Optionally, in v1 handlers, add a warning header:

  ```ts
  return NextResponse.json(
    { warning: "v1 endpoint deprecated, please use v2", … },
    { status: 200, headers: { "x-deprecation-warning": "Use v2" } }
  );
  ```
* Verify no inadvertent v2 routes appear in the v1 folder.
  (Req 8.4)
  ‣ (Req 8.4)

---
