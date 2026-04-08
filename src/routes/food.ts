import { FastifyPluginAsync } from 'fastify';

interface FoodNtrItem {
  FOOD_NM_KR: string;
  AMT_NUM1: string;
  AMT_NUM3: string;
  AMT_NUM4: string;
  AMT_NUM6: string;
  SERVING_SIZE: string;
  MAKER_NM: string;
  FOOD_CD: string;
}

const food: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { q: string } }>(
    '/api/food/search',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { q } = request.query;

      const params = new URLSearchParams({
        serviceKey: process.env.DATA_GO_KR_API_KEY ?? '',
        pageNo: '1',
        numOfRows: '20',
        type: 'json',
        FOOD_NM_KR: q,
      });

      const url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02?${params}`;

      let items: FoodNtrItem[];
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`upstream ${res.status}`);
        const json = await res.json();
        items = json?.body?.items ?? [];
      } catch (err) {
        fastify.log.error(err, 'food search upstream error');
        return reply.status(500).send({ error: 'Failed to fetch food data' });
      }

      const mapped = items.map((item) => ({
        foodName: item.FOOD_NM_KR,
        caloriesKcal: parseFloat(item.AMT_NUM1),
        proteinG: parseFloat(item.AMT_NUM3),
        fatG: parseFloat(item.AMT_NUM4),
        carbsG: parseFloat(item.AMT_NUM6),
        servingSize: item.SERVING_SIZE,
        manufacturer: item.MAKER_NM,
        externalId: item.FOOD_CD,
      }));

      for (const item of mapped) {
        await fastify.prisma.foodCache.upsert({
          where: { externalId: item.externalId },
          update: item,
          create: item,
        });
      }

      return reply.send({ data: mapped });
    }
  );
};

export default food;
