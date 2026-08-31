/**
 * Review API calls (`/api/v1/properties/:propertyId/reviews`, `/api/v1/reviews/:id`).
 */

import { apiFetch, apiFetchPaged, type ApiPagination } from "./client";
import type { Review, ReviewCreateInput, ReviewMeta } from "./types";

export type ReviewListParams = {
  page?: number;
  limit?: number;
};

/**
 * List reviews for a property along with aggregate rating meta.
 */
export async function listReviews(
  propertyId: string,
  params: ReviewListParams = {},
  signal?: AbortSignal,
): Promise<{ items: Review[]; meta?: ReviewMeta; pagination?: ApiPagination }> {
  const { data, meta, pagination } = await apiFetchPaged<Review[], ReviewMeta>(
    `/properties/${propertyId}/reviews`,
    {
      query: {
        page: params.page,
        limit: params.limit,
      },
      signal,
    },
  );
  return { items: data ?? [], meta, pagination };
}

/**
 * Leave a review for a property.
 */
export async function createReview(
  propertyId: string,
  input: ReviewCreateInput,
  signal?: AbortSignal,
): Promise<Review> {
  return apiFetch<Review>(`/properties/${propertyId}/reviews`, {
    method: "POST",
    body: input,
    signal,
  });
}

/**
 * Delete a review by its ID (creator or admin).
 */
export async function deleteReview(
  reviewId: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiFetch<unknown>(`/reviews/${reviewId}`, {
    method: "DELETE",
    signal,
  });
}
