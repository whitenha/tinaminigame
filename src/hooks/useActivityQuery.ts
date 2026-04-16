import { useQuery } from '@tanstack/react-query';
import { getActivity, getActivityItems } from '@/app/actions/activityActions';

export function useActivityQuery(id: any) {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: async () => {
      const { data, error } = await getActivity(id);
      // @ts-ignore
      if (error) throw new Error(error.message || 'Lỗi lấy dữ liệu trò chơi');
      if (!data) throw new Error('Không tìm thấy dữ liệu trò chơi');
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, 
  });
}

export function useActivityItemsQuery(activityId: any) {
  return useQuery({
    queryKey: ['activityItems', activityId],
    queryFn: async () => {
      const { data, error } = await getActivityItems(activityId);
      // @ts-ignore
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!activityId,
    staleTime: 5 * 60 * 1000, 
  });
}
