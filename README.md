# Dashboard Financeiro

Dashboard financeiro em React + Vite + Supabase para controle de gastos pessoais.

## Estrutura

- `index.html`
- `package.json`
- `tailwind.config.js`
- `postcss.config.js`
- `vite.config.js`
- `.env`
- `src/`
	- `main.jsx`
	- `index.css`
	- `supabaseClient.js`
	- `App.jsx`
	- `components/Auth.jsx`
	- `components/Dashboard.jsx`

## Setup Local

1. Instale as dependências:

```bash
npm install
```

2. Configure o arquivo `.env` com a URL e a chave `anon` do seu projeto Supabase.

3. Rode o projeto em desenvolvimento:

```bash
npm run dev
```

## Banco de Dados

Execute este script no SQL Editor do Supabase:

```sql
CREATE TABLE categories (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	user_id UUID REFERENCES auth.users(id) NOT NULL,
	name TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE expenses (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	user_id UUID REFERENCES auth.users(id) NOT NULL,
	category_id UUID REFERENCES categories(id) NOT NULL,
	amount DECIMAL(10, 2) NOT NULL,
	description TEXT,
	expense_date DATE NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total as proprias categorias" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Acesso total aos proprios gastos" ON expenses FOR ALL USING (auth.uid() = user_id);
```

### Migrações

Para bancos já existentes, rode no SQL Editor conforme forem sendo adicionadas.

Prazo dos lançamentos recorrentes (último mês cobrado; `NULL` = repete sem fim):

```sql
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
```

Autoexclusão de conta (o cliente nunca tem a service role key, então a exclusão do
usuário em `auth.users` precisa passar por uma função `SECURITY DEFINER`; `SET search_path`
evita sequestro de search_path nesse tipo de função):

```sql
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	DELETE FROM expenses WHERE user_id = auth.uid();
	DELETE FROM goals WHERE user_id = auth.uid();
	DELETE FROM categories WHERE user_id = auth.uid();
	DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
```

## GitHub Pages

1. Ajuste `base` em `vite.config.js` para o nome exato do seu repositório.
2. Gere a versão de produção:

```bash
npm run build
```

3. Publique a pasta `dist` com GitHub Pages ou GitHub Actions.