CREATE TABLE public.categories (id serial PRIMARY KEY, name text UNIQUE NOT NULL);
CREATE TABLE public.brands (id serial PRIMARY KEY, name text UNIQUE NOT NULL, category_id int NOT NULL REFERENCES public.categories(id));
CREATE TABLE public.skus (id serial PRIMARY KEY, sku_code text NOT NULL, sku_name text NOT NULL, brand_id int NOT NULL REFERENCES public.brands(id), base_price numeric NOT NULL, weight_tier text NOT NULL);
CREATE TABLE public.plants (id serial PRIMARY KEY, name text UNIQUE NOT NULL, state text NOT NULL, latitude numeric NOT NULL, longitude numeric NOT NULL, capacity_units bigint NOT NULL, operational_status text NOT NULL);
CREATE TABLE public.mother_warehouses (id serial PRIMARY KEY, name text NOT NULL, state text NOT NULL, zone text NOT NULL, capacity_pallets int NOT NULL, latitude numeric NOT NULL, longitude numeric NOT NULL);
CREATE TABLE public.distributors (id serial PRIMARY KEY, name text UNIQUE NOT NULL, region text NOT NULL, credit_tier text NOT NULL, fulfillment_lead_days int NOT NULL, latitude numeric, longitude numeric);
CREATE TABLE public.transactions (id serial PRIMARY KEY, period_month text NOT NULL, period_quarter text NOT NULL, month_index int NOT NULL, plant_id int NOT NULL REFERENCES public.plants(id), mother_warehouse_id int NOT NULL REFERENCES public.mother_warehouses(id), distributor_id int NOT NULL REFERENCES public.distributors(id), sku_id int NOT NULL REFERENCES public.skus(id), units_sold bigint NOT NULL, sales_inr bigint NOT NULL, transaction_rows int NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['categories','brands','skus','plants','mother_warehouses','distributors','transactions'] LOOP
  EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('CREATE POLICY "Public read" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
END LOOP; END $$;

INSERT INTO public.categories(name) VALUES ('Personal Care'),('Home Care'),('Foods & Refreshments'),('Packaged Foods');
INSERT INTO public.brands(name, category_id) VALUES
('Velvet Soft Soap',1),('SunGlow Face Wash',1),('PureMint Toothpaste',1),('SilkStrand Shampoo',1),
('CleanMax Detergent',2),('SparkDish Liquid',2),('ShineFloor Cleaner',2),('AquaFresh Toilet Care',2),
('FreshLeaf Tea',3),('BrewCraft Coffee',3),('ChillPop Beverages',3),('CreamDream Ice Cream',3),
('Golden Crunch Biscuits',4),('NutriSpread Peanut Butter',4),('SpiceRoute Masala',4),('QuickBowl Noodles',4);

INSERT INTO public.skus(sku_code, sku_name, brand_id, base_price, weight_tier)
SELECT 'SKU-' || lpad(b::text,2,'0') || '-' || lpad(n::text,3,'0'),
  (SELECT name FROM public.brands WHERE id=b) || ' ' || (ARRAY['Sachet','Travel Pack','Single','Small','Family','Medium','Large','Bulk','Value Pack','Combo'])[((n-1)%10)+1] || ' V' || ((n-1)/10+1),
  b,
  round((ARRAY[45,95,210,520])[((n-1)%4)+1] * (0.8 + ((b*37+n*11)%40)/100.0), 2),
  (ARRAY['Sachet/Travel','Small/Single','Medium/Family','Large/Bulk'])[((n-1)%4)+1]
FROM generate_series(1,16) b, generate_series(1,40) n ORDER BY b, n;

INSERT INTO public.plants(name,state,latitude,longitude,capacity_units,operational_status) VALUES
('Baddi','Himachal Pradesh',30.95,76.79,11000000,'Optimal'),
('Bhiwadi','Rajasthan',28.21,76.86,10000000,'Near Capacity'),
('Haridwar','Uttarakhand',29.95,78.16,12000000,'Optimal'),
('Sanand','Gujarat',22.99,72.38,10500000,'Near Capacity'),
('Hosur','Tamil Nadu',12.74,77.83,11500000,'Optimal'),
('Kolkata','West Bengal',22.57,88.36,9000000,'Maintenance'),
('Hyderabad','Telangana',17.39,78.49,10000000,'Optimal'),
('Guwahati','Assam',26.14,91.74,7000000,'Near Capacity');

INSERT INTO public.mother_warehouses(name,state,zone,capacity_pallets,latitude,longitude) VALUES
('Delhi NCR Mother DC','Haryana','North',42000,28.46,77.03),
('Bhiwandi Mother DC','Maharashtra','West',48000,19.30,73.06),
('Chennai Mother DC','Tamil Nadu','South',38000,13.08,80.27),
('Dankuni Mother DC','West Bengal','East',30000,22.68,88.29),
('Bengaluru Mother DC','Karnataka','South',34000,12.97,77.59),
('Ahmedabad Mother DC','Gujarat','West',28000,23.02,72.57);

INSERT INTO public.distributors(name,region,credit_tier,fulfillment_lead_days,latitude,longitude) VALUES
('Punjab Trade Links','North','Gold',3,30.90,75.85),
('Capital Consumer Distributors','North','Platinum',2,28.61,77.21),
('Lucknow Retail Supply','North','Silver',5,26.85,80.95),
('Jaipur FMCG Partners','North','Gold',4,26.91,75.79),
('Mumbai Metro Distribution','West','Platinum',2,19.08,72.88),
('Pune Market Movers','West','Gold',3,18.52,73.86),
('Gujarat Retail Network','West','Silver',4,23.03,72.58),
('Chennai Coastal Traders','South','Platinum',2,13.08,80.27),
('Bengaluru Prime Distributors','South','Gold',3,12.97,77.59),
('Kerala Spice Coast Supply','South','Silver',6,9.93,76.27),
('Kolkata Eastern Agencies','East','Gold',4,22.57,88.36),
('Bhubaneswar Trade Hub','East','Silver',5,20.30,85.82),
('Northeast Frontier Supply','East','Silver',7,26.14,91.74);

INSERT INTO public.transactions(period_month,period_quarter,month_index,plant_id,mother_warehouse_id,distributor_id,sku_id,units_sold,sales_inr,transaction_rows,created_at)
SELECT
  (ARRAY['April','May','June','July','August','September','October','November','December','January','February','March'])[m],
  'Q' || ((m-1)/3+1), m, p, w, d, s, u, (u * pr * (0.85 + (h2 % 30)/100.0))::bigint, 20 + (h1 % 80),
  make_date(CASE WHEN m<=9 THEN 2023 ELSE 2024 END, ((m+2)%12)+1, 1 + (i % 28))
FROM (
  SELECT i, ((i-1)%12)+1 AS m, ((i*7)%640)+1 AS s, ((i*3+(i/97))%8)+1 AS p, ((i*5+(i/53))%13)+1 AS d,
    (i::bigint*2654435761)%1000 AS h1, (i::bigint*40503)%997 AS h2
  FROM generate_series(1,11000) i
) g
CROSS JOIN LATERAL (SELECT base_price AS pr FROM public.skus WHERE id=g.s) sk
CROSS JOIN LATERAL (SELECT region FROM public.distributors WHERE id=g.d) dr
CROSS JOIN LATERAL (SELECT CASE dr.region WHEN 'North' THEN 1 WHEN 'East' THEN 4 WHEN 'South' THEN (CASE WHEN g.i%2=0 THEN 3 ELSE 5 END) ELSE (CASE WHEN g.i%3=0 THEN 6 ELSE 2 END) END AS w) wh
CROSS JOIN LATERAL (SELECT ((2000 + g.h1*9) * (1 + 0.25*sin(g.m*0.6)) * CASE WHEN sk.pr < 80 THEN 2.2 WHEN sk.pr < 200 THEN 1.1 ELSE 0.6 END)::bigint AS u) uu;

-- Reconcile to benchmark totals: 69,560,000 units, ₹2,225.64 Cr, 650,000 rows
UPDATE public.transactions SET units_sold = round(units_sold * (69560000.0 / (SELECT sum(units_sold) FROM public.transactions)));
UPDATE public.transactions SET sales_inr = round(sales_inr * (22256400000.0 / (SELECT sum(sales_inr) FROM public.transactions)));
UPDATE public.transactions SET transaction_rows = round(transaction_rows * (650000.0 / (SELECT sum(transaction_rows) FROM public.transactions)));

CREATE INDEX ON public.transactions(month_index);
CREATE INDEX ON public.transactions(plant_id);
CREATE INDEX ON public.transactions(distributor_id);
CREATE INDEX ON public.transactions(sku_id);

CREATE VIEW public.transaction_details WITH (security_invoker = true) AS
SELECT t.id, t.period_month, t.period_quarter, t.month_index, t.units_sold, t.sales_inr, t.transaction_rows,
  s.sku_code, s.sku_name, s.weight_tier, b.name AS brand, c.name AS category,
  p.name AS plant, w.name AS warehouse, w.zone AS warehouse_zone, d.name AS distributor, d.region, d.credit_tier
FROM public.transactions t
JOIN public.skus s ON s.id=t.sku_id JOIN public.brands b ON b.id=s.brand_id JOIN public.categories c ON c.id=b.category_id
JOIN public.plants p ON p.id=t.plant_id JOIN public.mother_warehouses w ON w.id=t.mother_warehouse_id JOIN public.distributors d ON d.id=t.distributor_id;
GRANT SELECT ON public.transaction_details TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.analytics_status() RETURNS json LANGUAGE sql STABLE SET search_path = public AS $$
SELECT json_build_object(
  'tables', json_build_object('categories',(SELECT count(*) FROM categories),'brands',(SELECT count(*) FROM brands),'skus',(SELECT count(*) FROM skus),'plants',(SELECT count(*) FROM plants),'mother_warehouses',(SELECT count(*) FROM mother_warehouses),'distributors',(SELECT count(*) FROM distributors),'transactions',(SELECT count(*) FROM transactions)),
  'totals', (SELECT json_build_object('sales_inr',sum(sales_inr),'units_sold',sum(units_sold),'transaction_rows',sum(transaction_rows)) FROM transactions));
$$;
GRANT EXECUTE ON FUNCTION public.analytics_status() TO anon, authenticated;