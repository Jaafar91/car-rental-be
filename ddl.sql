-- public.branches definition

-- Drop table

-- DROP TABLE public.branches;

CREATE TABLE public.branches (
	branch_id bigserial NOT NULL,
	branch_name varchar(120) NOT NULL,
	address text NULL,
	phone varchar(30) NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	email varchar(255) NULL,
	city varchar(255) NULL,
	state varchar(255) NULL,
	CONSTRAINT branches_name_key UNIQUE (branch_name),
	CONSTRAINT branches_pkey PRIMARY KEY (branch_id)
);


-- public.car_categories definition

-- Drop table

-- DROP TABLE public.car_categories;

CREATE TABLE public.car_categories (
	category_id bigserial NOT NULL,
	category_name varchar(80) NOT NULL,
	daily_rate numeric(10, 2) NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	description varchar(255) NULL,
	CONSTRAINT car_categories_daily_rate_check CHECK ((daily_rate >= (0)::numeric)),
	CONSTRAINT car_categories_name_key UNIQUE (category_name),
	CONSTRAINT car_categories_pkey PRIMARY KEY (category_id)
);


-- public.car_status definition

-- Drop table

-- DROP TABLE public.car_status;

CREATE TABLE public.car_status (
	status_id smallserial NOT NULL,
	status_name varchar(30) NOT NULL,
	description varchar(255) NULL,
	CONSTRAINT car_status_name_key UNIQUE (status_name),
	CONSTRAINT car_status_pkey PRIMARY KEY (status_id)
);


-- public.customers definition

-- Drop table

-- DROP TABLE public.customers;

CREATE TABLE public.customers (
	customer_id bigserial NOT NULL,
	full_name varchar(160) NOT NULL,
	email varchar(255) NULL,
	phone varchar(30) NULL,
	license_no varchar(60) NULL,
	license_exp date NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT customers_email_key UNIQUE (email),
	CONSTRAINT customers_pkey PRIMARY KEY (customer_id)
);


-- public.cars definition

-- Drop table

-- DROP TABLE public.cars;

CREATE TABLE public.cars (
	car_id bigserial NOT NULL,
	category_id int8 NOT NULL,
	status_id int2 NOT NULL,
	branch_id int8 NULL,
	vin varchar(30) NULL,
	license_plate varchar(20) NULL,
	make varchar(80) NULL,
	model varchar(80) NULL,
	"year" int4 NULL,
	seat_count int4 NULL,
	transmission varchar(30) NULL,
	fuel_type varchar(30) NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT cars_check CHECK (((vin IS NOT NULL) OR (license_plate IS NOT NULL))),
	CONSTRAINT cars_license_plate_key UNIQUE (license_plate),
	CONSTRAINT cars_pkey PRIMARY KEY (car_id),
	CONSTRAINT cars_seat_count_check CHECK ((seat_count > 0)),
	CONSTRAINT cars_vin_key UNIQUE (vin),
	CONSTRAINT cars_year_check CHECK (((year >= 1980) AND (year <= ((EXTRACT(year FROM now()))::integer + 1)))),
	CONSTRAINT cars_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
	CONSTRAINT cars_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.car_categories(category_id),
	CONSTRAINT cars_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.car_status(status_id)
);
CREATE INDEX idx_cars_branch ON public.cars USING btree (branch_id);
CREATE INDEX idx_cars_status ON public.cars USING btree (status_id);


-- public.maintenance definition

-- Drop table

-- DROP TABLE public.maintenance;

CREATE TABLE public.maintenance (
	maintenance_id bigserial NOT NULL,
	car_id int8 NOT NULL,
	description text NOT NULL,
	scheduled_at timestamptz NULL,
	completed_at timestamptz NULL,
	cost_amount numeric(10, 2) NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now(),
	maintenance_type varchar(255) NULL,
	CONSTRAINT maintenance_cost_amount_check CHECK ((cost_amount >= (0)::numeric)),
	CONSTRAINT maintenance_pkey PRIMARY KEY (maintenance_id),
	CONSTRAINT maintenance_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(car_id) ON DELETE CASCADE
);
CREATE INDEX idx_maintenance_car ON public.maintenance USING btree (car_id);


-- public.reservations definition

-- Drop table

-- DROP TABLE public.reservations;

CREATE TABLE public.reservations (
	reservation_id bigserial NOT NULL,
	customer_id int8 NOT NULL,
	branch_id int8 NULL,
	pickup_at timestamptz NOT NULL,
	dropoff_at timestamptz NOT NULL,
	status varchar(30) NOT NULL DEFAULT 'pending'::character varying,
	notes text NULL,
	agreement_signed bool NOT NULL DEFAULT false,
	agreement_signature text NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	car_id int4 NOT NULL,
	total_amount numeric(18, 3) NULL,
	CONSTRAINT reservations_check CHECK ((dropoff_at > pickup_at)),
	CONSTRAINT reservations_pkey PRIMARY KEY (reservation_id),
	CONSTRAINT reservations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[]))),
	CONSTRAINT reservations_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id),
	CONSTRAINT reservations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id),
	CONSTRAINT reservations_fk FOREIGN KEY (car_id) REFERENCES public.cars(car_id)
);
CREATE INDEX idx_reservations_branch ON public.reservations USING btree (branch_id);
CREATE INDEX idx_reservations_customer ON public.reservations USING btree (customer_id);


-- public.staff definition

-- Drop table

-- DROP TABLE public.staff;

CREATE TABLE public.staff (
	staff_id bigserial NOT NULL,
	first_name varchar(160) NOT NULL,
	email varchar(255) NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	branch_id int4 NOT NULL,
	phone varchar(50) NULL,
	last_name varchar(160) NOT NULL,
	"role" varchar(20) NULL,
	hire_date date NULL,
	is_active bool NULL,
	CONSTRAINT staff_email_key UNIQUE (email),
	CONSTRAINT staff_pkey PRIMARY KEY (staff_id),
	CONSTRAINT staff_fk FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id)
);


-- public.rentals definition

-- Drop table

-- DROP TABLE public.rentals;

CREATE TABLE public.rentals (
	rental_id bigserial NOT NULL,
	reservation_id int8 NULL,
	customer_id int8 NOT NULL,
	car_id int8 NOT NULL,
	branch_pickup_id int8 NULL,
	branch_dropoff_id int8 NULL,
	rental_date timestamptz NOT NULL,
	return_date timestamptz NULL,
	daily_rate numeric(10, 2) NOT NULL,
	discount_amount numeric(10, 2) NOT NULL DEFAULT 0,
	currency bpchar(3) NOT NULL DEFAULT 'USD'::bpchar,
	status varchar(30) NOT NULL DEFAULT 'active'::character varying,
	mileage_start int4 NULL,
	mileage_end int4 NULL,
	total_amount numeric(12, 2) NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	rental_time_range tstzrange NULL GENERATED ALWAYS AS (tstzrange(rental_date, return_date, '[)'::text)) STORED,
	due_date timestamptz NOT NULL,
	CONSTRAINT rentals_check CHECK ((return_date > rental_date)),
	CONSTRAINT rentals_daily_rate_check CHECK ((daily_rate >= (0)::numeric)),
	CONSTRAINT rentals_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
	CONSTRAINT rentals_mileage_end_check CHECK (((mileage_end IS NULL) OR (mileage_end >= 0))),
	CONSTRAINT rentals_mileage_start_check CHECK (((mileage_start IS NULL) OR (mileage_start >= 0))),
	CONSTRAINT rentals_pkey PRIMARY KEY (rental_id),
	CONSTRAINT rentals_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'closed'::character varying, 'cancelled'::character varying])::text[]))),
	CONSTRAINT rentals_total_amount_check CHECK (((total_amount IS NULL) OR (total_amount >= (0)::numeric))),
	CONSTRAINT rentals_branch_dropoff_id_fkey FOREIGN KEY (branch_dropoff_id) REFERENCES public.branches(branch_id),
	CONSTRAINT rentals_branch_pickup_id_fkey FOREIGN KEY (branch_pickup_id) REFERENCES public.branches(branch_id),
	CONSTRAINT rentals_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(car_id),
	CONSTRAINT rentals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id),
	CONSTRAINT rentals_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(reservation_id) ON DELETE SET NULL
);
CREATE INDEX idx_rentals_car ON public.rentals USING btree (car_id);
CREATE INDEX idx_rentals_customer ON public.rentals USING btree (customer_id);

-- Table Triggers

create trigger trg_rentals_set_updated_at before
update
    on
    public.rentals for each row execute function set_updated_at();
create trigger trg_rentals_customer_match_reservation before
insert
    or
update
    of reservation_id,
    customer_id on
    public.rentals for each row execute function enforce_rental_customer_matches_reservation();


-- public.payments definition

-- Drop table

-- DROP TABLE public.payments;

CREATE TABLE public.payments (
	payment_id bigserial NOT NULL,
	rental_id int8 NOT NULL,
	amount numeric(10, 2) NOT NULL,
	currency bpchar(3) NOT NULL DEFAULT 'USD'::bpchar,
	"method" varchar(30) NOT NULL,
	status varchar(30) NOT NULL DEFAULT 'paid'::character varying,
	paid_at timestamptz NOT NULL DEFAULT now(),
	reference varchar(120) NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric)),
	CONSTRAINT payments_method_check CHECK (((method)::text = ANY ((ARRAY['cash'::character varying, 'card'::character varying, 'bank_transfer'::character varying, 'other'::character varying])::text[]))),
	CONSTRAINT payments_pkey PRIMARY KEY (payment_id),
	CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['paid'::character varying, 'pending'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))),
	CONSTRAINT payments_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(rental_id) ON DELETE CASCADE
);
CREATE INDEX idx_payments_rental ON public.payments USING btree (rental_id);