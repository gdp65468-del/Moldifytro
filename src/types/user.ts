export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  planType: "free";
  publishedTemplatesCount: number;
  createdAt: string;
}
