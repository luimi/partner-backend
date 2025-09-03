
exports.redeemCoupon = async (request) => {
  const {code} = request.params;
  const coupon = await new Parse.Query("Coupon").equalTo("redeemed", false).get(code, {useMasterKey: true})
  const user = await new Parse.Query(Parse.User).get(request.user.id, {useMasterKey: true})
  if(!coupon) {
    return {success: false}
  }
  const account = await new Parse.Query("Account").equalTo("user", user).first({useMasterKey: true});
  account.set("balance", account.get("balance") + coupon.get("tokens"))
  await account.save(null, {useMasterKey: true});
  coupon.set('redeemed', true);
  coupon.set('user', user);
  let acl = coupon.getACL();
  acl.setReadAccess(user.id, true)
  coupon.setACL(acl);
  await coupon.save(null, {useMasterKey: true});
  return {success: true}
}