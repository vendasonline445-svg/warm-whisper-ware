const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bin } = await req.json();
    if (!bin || bin.length < 6) {
      return new Response(JSON.stringify({ error: 'BIN inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanBin = bin.replace(/\D/g, '').slice(0, 6);

    const res = await fetch(`https://lookup.binlist.net/${cleanBin}`, {
      headers: { 'Accept-Version': '3' },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'BIN não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const result = {
      scheme: data.scheme || '',
      type: data.type || '',
      bank_name: data.bank?.name || '',
      country_name: data.country?.name || '',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
