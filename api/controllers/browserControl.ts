import { Request, Response } from 'restify'
import { getUserAuth } from '../util/pauth';
import { NOT_AUTHORIZED_MESSAGE } from '../util/util';
export async function startBrowserControl(req: Request, res: Response) {
    console.log('here')
    /*
  const auth = getUserAuth(req);
  if (!auth) {
    const message = NOT_AUTHORIZED_MESSAGE;
    return res.json({
      message,
      error: message,
    })
  }
  */
  try {
    
    //joins:{ table:{col:als}}
    
      return res.json({
        message: 'ok'
    });
  } catch (err: any) {
    console.log('doGetError',err);
    res.send(500, {
      message: err.message,
      errors: err.errors
    });
  }
}