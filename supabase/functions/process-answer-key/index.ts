import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Question {
  questionId: string;
  type: 'MCQ' | 'MSQ' | 'NAT';
  correctAnswers: string[];
  marks: number;
  negativeMarks: number;
  explanation: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing answer key image with AI...');
    
    const systemPrompt = `You are an expert at extracting structured data from UCEED/CEED design entrance exam answer keys.

Extract ALL questions from the answer key image and return them in the following JSON format:
{
  "questions": [
    {
      "questionId": "string (e.g., '1', '2', etc.)",
      "type": "MCQ | MSQ | NAT",
      "correctAnswers": ["array of correct answer options - for MCQ: single option like 'A', for MSQ: multiple options like ['A', 'C'], for NAT: numerical answer as string"],
      "marks": number (positive marks for correct answer),
      "negativeMarks": number (negative marks for incorrect answer, typically 1 for MCQ/MSQ, 0 for NAT),
      "explanation": "string (detailed explanation of the solution)"
    }
  ]
}

Guidelines:
- For MCQ (Multiple Choice Question): Only ONE correct answer
- For MSQ (Multiple Select Question): Multiple correct answers possible
- For NAT (Numerical Answer Type): Answer is a number
- Extract ALL visible questions from the image
- If marks/negative marks are not specified, use defaults: MCQ/MSQ = 3 marks, -1 negative; NAT = 3 marks, 0 negative
- Provide clear, detailed explanations
- Question IDs should be sequential numbers as strings`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to process image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    console.log('AI processing complete');
    
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(content);
    
    // Validate the structure
    if (!extractedData.questions || !Array.isArray(extractedData.questions)) {
      console.error('Invalid data structure:', extractedData);
      return new Response(
        JSON.stringify({ error: 'Invalid data structure from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully extracted ${extractedData.questions.length} questions`);

    return new Response(
      JSON.stringify({ questions: extractedData.questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-answer-key function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});