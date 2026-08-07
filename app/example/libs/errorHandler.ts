export const handleError = (message: string, statusCode: number) => {
  return Response.json({ message }, { status: statusCode });
};
