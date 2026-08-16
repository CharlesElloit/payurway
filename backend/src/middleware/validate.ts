import { Request, Response, NextFunction } from 'express';
import { AnySchema } from 'joi';
import { BadRequestError } from '../utils/errors';

export function validate(schema: AnySchema, property: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new BadRequestError(message));
    }

    req[property] = value;
    next();
  };
}
