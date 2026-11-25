-- BEGIN / ROLLBACK required: this test does not retain any accounts or attempts.
do $test$
declare u bigint;n text:='login-check-'||gen_random_uuid()::text;p text:=encode(extensions.gen_random_bytes(20),'hex');x jsonb;t text;cnt integer;phone text:='08'||lpad((random()*9999999999)::bigint::text,10,'0');
begin
 insert into public.users(username,password_hash,role) values(n,encode(extensions.digest(p,'sha256'),'hex'),'kasir') returning id into u;
 set local role anon;
 x:=public.ubnb_secure_login('staff',n,encode(extensions.digest(p,'sha256'),'hex'));if x->>'ok'<>'false' then raise exception 'Hash accepted as password';end if;
 x:=public.ubnb_secure_login('staff',n,p);if x->>'ok'<>'true' then raise exception 'Correct password rejected';end if;
 t:=x->>'token';perform set_config('request.headers',jsonb_build_object('x-ubnb-staff',t)::text,true);
 if public.ubnb_secure_reauth(u,encode(extensions.digest(p,'sha256'),'hex')) is not null then raise exception 'Hash accepted for confirmation';end if;
 reset role;
 update public.users set password_hash=encode(extensions.digest(p||'-changed','sha256'),'hex') where id=u;
 set local role anon;
 if public.ubnb_secure_session('staff') is not null then raise exception 'Password change did not invalidate session';end if;
 x:=public.ubnb_secure_login('member',phone,'wrong');
 x:=public.ubnb_secure_login('member','62 '||substr(phone,2),'wrong');
 x:=public.ubnb_secure_member_register(null,null,null,null,null);if x->>'ok'<>'false' then raise exception 'Null registration accepted';end if;
 reset role;
 select failures into cnt from private.ubnb_secure_attempts where identifier='member:'||phone;
 if cnt<>2 then raise exception 'Alternate phone format bypassed throttle';end if;
 update public.users set password_hash='legacy-'||p where id=u;
 set local role anon;
 x:=public.ubnb_secure_login('staff',n,'legacy-'||p);if x->>'ok'<>'true' then raise exception 'Legacy password login broken';end if;
 reset role;
end $test$;
