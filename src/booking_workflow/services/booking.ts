// import axiosClient from "@/core/api/axiosClient";
// import { BookingRequestDto, CreateBookingRequestDto } from "../types/booking";

// export const BookingApi = {
//   getAll: async (): Promise<BookingRequestDto[]> => {
//     const res = await axiosClient.get("/api/bookingrequests");
//     return res.data;
//   },
//   getById: async (id: number): Promise<BookingRequestDto> => {
//     const res = await axiosClient.get(`/api/bookingrequests/${id}`);
//     return res.data;
//   },
//   create: async (data: CreateBookingRequestDto): Promise<BookingRequestDto> => {
//     const res = await axiosClient.post("/api/bookingrequests", data);
//     return res.data;
//   },
//   updateStatus: async (
//     id: number,
//     newStatus: string,
//     comment?: string,
//     changedBy?: number
//   ): Promise<BookingRequestDto> => {
//     const res = await axiosClient.patch(`/api/bookingrequests/${id}/status`, {
//       newStatus,
//       comment,
//       changedBy,
//     });
//     return res.data;
//   },
// };
