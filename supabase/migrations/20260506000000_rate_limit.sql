-- Create request_logs table for rate limiting
create table public.request_logs (
    id uuid default gen_random_uuid() primary key,
    ip_address text,
    user_id uuid references auth.users(id) on delete set null,
    endpoint text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (though only used by server)
alter table public.request_logs enable row level security;

-- Add index for fast querying by ip/user and time
create index idx_request_logs_rate_limit on public.request_logs (endpoint, created_at);
create index idx_request_logs_ip on public.request_logs (ip_address, endpoint, created_at);
create index idx_request_logs_user on public.request_logs (user_id, endpoint, created_at);
