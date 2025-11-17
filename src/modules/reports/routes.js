import { HttpError } from '../../utils/errors.js';
import { buildReportPdf } from './pdf.js';
import { config } from '../../config.js';

async function routes(fastify, _opts, done) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/history', async () => {
    const { data, error } = await fastify.supabase
      .from('report_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new HttpError(500, 'No se pudo cargar el historial');
    return data;
  });

  fastify.post('/', async (request, reply) => {
    const { tipo = 'ALQUILERES', fecha_inicio, fecha_fin } = request.body ?? {};
    if (!fecha_inicio || !fecha_fin) throw new HttpError(400, 'Debe indicar el rango de fechas');

    const dataset = await fastify.supabase.rpc('fn_report_dataset', {
      p_tipo: tipo,
      p_inicio: fecha_inicio,
      p_fin: fecha_fin,
    });
    if (dataset.error) throw new HttpError(500, dataset.error.message);
    const items = dataset.data ?? [];

    const pdfBuffer = await buildReportPdf({ tipo, fecha_inicio, fecha_fin, items });
    const fileName = `report-${tipo}-${Date.now()}.pdf`;
    const upload = await fastify.supabase.storage
      .from(config.reportsBucket)
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });
    if (upload.error) throw new HttpError(500, 'No se pudo subir el PDF');
    const publicUrl = fastify.supabase.storage.from(config.reportsBucket).getPublicUrl(fileName).data.publicUrl;

    const record = await fastify.supabase
      .from('report_requests')
      .insert({
        tipo,
        fecha_inicio,
        fecha_fin,
        empleado_id: request.user.sub,
        url_pdf: publicUrl,
        estado: 'GENERADO',
      })
      .select('*')
      .single();
    if (record.error) throw new HttpError(500, 'No se pudo registrar el reporte');

    reply.code(201).send({ report: record.data, url: publicUrl });
  });

  done();
}

export default routes;
