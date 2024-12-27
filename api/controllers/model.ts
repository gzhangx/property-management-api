import {data, IDBFieldDef} from '../models/index';
import {Request, Response} from 'restify'
async function getModel(req:Request, res:Response) {
  try {
    console.log(`getModel -> ${req.query.name}`);
    const m = data[req.query.name];
    console.log(`getModel done ${req.query.name}`);
    const resm = {
      ...m,
      fields: [...m.fields],
      
    };
    resm.fields = resm.fields.map(f => {
      if (f.autoValueFunc)
        return null;
      return f;
    }).filter(f => f) as IDBFieldDef[];
    return res.json(resm);
  } catch (err: any) {
      console.log('getModel Error');
      console.log(err);
      res.send(500, {
        name: req.query.name,
        message: err.message,
       errors: err.errors
      });
    }
}
  
module.exports = {
  getModel,
}