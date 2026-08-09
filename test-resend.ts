import { Resend } from "resend";
const resend = new Resend("re_123");
type Res = Awaited<ReturnType<typeof resend.domains.list>>;
const test: Res = null as any;
