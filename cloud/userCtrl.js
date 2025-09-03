require('dotenv').config()

const {GOOGLE_CLIENTID} = process.env;

exports.googleSignin = async (request) => {
  const { id_token } = request.params;

  if (!id_token) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, "El parámetro id_token no fue proporcionado.");
  }

  try {
    // 1. Validar el token de Google y obtener la información del usuario
    const tokenInfoUrl = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${id_token}`;
    const response = await fetch(tokenInfoUrl)
    const userData = await response.json();

    // Verificar el ID del cliente para evitar ataques de suplantación
    if (userData.aud !== GOOGLE_CLIENTID) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, "ID de cliente no válido.");
    }

    // 2. Buscar si el usuario ya existe en Parse
    const query = new Parse.Query(Parse.User);
    query.equalTo("authData.google.id", userData.sub);

    let user = await query.first({useMasterKey: true});
    // 3. Si el usuario no existe, crearlo
    const authData = {
      id: userData.sub,
      id_token: id_token
    };
    if (!user) {
      const acl = new Parse.ACL();
      acl.setRoleReadAccess("Admin", true)
      user = new Parse.User();
      user.set("username", userData.email);
      user.set("email", userData.email);
      user.set("name", userData.name);
      user.set("authData", {
        google: authData,
      });
      user.setACL(acl)
      await user.save(null, {useMasterKey: true});

      if(user) {
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        acl.setRoleReadAccess('Admin', true);
        acl.setRoleWriteAccess('Admin', true);
        acl.setReadAccess(user.id, true);
        acl.setWriteAccess(user.id, false);
        let account = new Parse.Object('Account');
        account.set('user', user);
        account.set('balance', 0);
        account.setACL(acl);
        await account.save(null, {useMasterKey: true});
        user.set("account", account);
        await user.save(null, {useMasterKey: true})
      }
    }

    // 4. devolver el token de sesión
    return authData
  } catch (error) {
    console.error("Error en el inicio de sesión de Google:", error);
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, "Error en el inicio de sesión. Detalles: " + error.message);
  }
}